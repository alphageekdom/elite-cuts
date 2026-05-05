'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import type { SerializedProduct } from '@/models/Product';

// Minimum product fields a cart line needs to render: id keys the line;
// name + price + images drive the card UI; category drives the eyebrow meta
// in cart rows. Anything wider (stockCount, description, …) is not stored.
export type CartLineProduct = Pick<
  SerializedProduct,
  '_id' | 'name' | 'price' | 'images' | 'category'
>;

// Wire / state shape for a cart line. Identical for guest (localStorage) and
// logged-in (API) paths so every consumer can read one shape regardless of
// auth state. CartItemSchema has `_id: false`, so the product id is the
// stable identifier — there is no per-line subdoc id.
export type CartLine = {
  product: CartLineProduct;
  quantity: number;
  price: number;
};

// Single-arg variant used by `useHandleAddToCart` callers — they pass the
// product fields the cart needs, optionally with a desired starting quantity
// (e.g. BuyBlock's stepper before the click).
export type AddItemArg = CartLineProduct & { quantity?: number };

type CartContextValue = {
  cartItems: CartLine[];
  cartCount: number;
  loading: boolean;
  addItemToCart: (item: AddItemArg) => Promise<void>;
  removeItemFromCart: (productId: string) => Promise<void>;
  setItemQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

const GUEST_CART_KEY = 'guestCart';

const CartContext = createContext<CartContextValue | null>(null);

const readGuestCart = (): CartLine[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items: CartLine[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // localStorage may be disabled / over quota — fail silently
  }
};

const clearGuestCart = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // see above
  }
};

// Apply an incremental "add N of this product" to a guest cart array. New
// line snapshots the product's current price so totals are stable even if
// the catalog price changes after-the-fact.
const applyAddToLines = (
  lines: CartLine[],
  product: CartLineProduct,
  addBy: number,
): CartLine[] => {
  const idx = lines.findIndex((l) => l.product._id === product._id);
  if (idx === -1) {
    return [...lines, { product, quantity: addBy, price: product.price }];
  }
  const next = [...lines];
  next[idx] = { ...next[idx], quantity: next[idx].quantity + addBy };
  return next;
};

const setQuantityOnLines = (
  lines: CartLine[],
  productId: string,
  quantity: number,
): CartLine[] => {
  if (quantity <= 0) return lines.filter((l) => l.product._id !== productId);
  return lines.map((l) =>
    l.product._id === productId ? { ...l, quantity } : l,
  );
};

const removeFromLines = (lines: CartLine[], productId: string): CartLine[] =>
  lines.filter((l) => l.product._id !== productId);

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isLoggedIn = Boolean(session?.user);

  // SSR renders an empty cart so server / client first paint always match —
  // any localStorage hydration would mismatch HTML and trip a hydration error.
  // The status effect below populates the real cart on mount: localStorage
  // for guests, API for logged-in users.
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);

  // Tracks the previous auth status across renders so we can detect the
  // unauthenticated → authenticated transition and run merge-on-login exactly
  // once. Re-running the merge on hot reload or tab focus would double-count.
  const prevStatusRef = useRef<typeof status>(status);
  // Guards parallel fetches when the auth status flips during an in-flight
  // request.
  const hydratingRef = useRef(false);

  // Server fetch for the logged-in cart. Replaces local state with the
  // canonical server view and clears any stale guest cart.
  const fetchServerCart = useCallback(async () => {
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/cart', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load cart');
      const data = (await res.json()) as { items: CartLine[] };
      setCartItems(data.items ?? []);
      clearGuestCart();
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      hydratingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Merge any local guest cart into the server cart, then refetch the result.
  // Runs once when the user transitions from unauthenticated to authenticated.
  // Each guest line is POSTed sequentially; a failure on one line surfaces as
  // a toast but doesn't block the rest.
  const mergeGuestCartIntoServer = useCallback(async () => {
    const guestLines = readGuestCart();
    if (guestLines.length === 0) {
      await fetchServerCart();
      return;
    }
    setLoading(true);
    try {
      for (const line of guestLines) {
        try {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              productId: line.product._id,
              quantity: line.quantity,
            }),
          });
          if (!res.ok) throw new Error('merge line failed');
        } catch (err) {
          console.error('Failed to merge line', line.product?._id, err);
        }
      }
      clearGuestCart();
      await fetchServerCart();
      toast.success('Your cart has been saved to your account');
    } finally {
      setLoading(false);
    }
  }, [fetchServerCart]);

  // Hydrate cart on mount and when auth status changes. Three branches:
  // (1) unauth → auth transition runs the one-time merge; (2) staying
  // authenticated re-fetches; (3) becoming a guest restores the (now likely
  // empty) localStorage cart.
  useEffect(() => {
    if (status === 'loading') return;

    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'authenticated') {
      if (prev === 'unauthenticated') {
        void mergeGuestCartIntoServer();
      } else {
        void fetchServerCart();
      }
    } else {
      // Guest: state already hydrated from localStorage in useState init.
      // Sync once in case another tab wrote between init and mount.
      setCartItems(readGuestCart());
    }
  }, [status, fetchServerCart, mergeGuestCartIntoServer]);

  const addItemToCart = useCallback(
    async (item: AddItemArg) => {
      if (!item?._id) {
        toast.error('Product not available');
        return;
      }
      const addBy = Math.max(1, Math.trunc(item.quantity ?? 1) || 1);
      const { quantity: _quantity, ...productOnly } = item;
      const product = productOnly as CartLineProduct;

      if (!isLoggedIn) {
        setCartItems((prev) => {
          const next = applyAddToLines(prev, product, addBy);
          writeGuestCart(next);
          return next;
        });
        toast.success('Item added to cart');
        return;
      }

      // Logged-in: optimistic update, revert on failure. The snapshot is
      // captured via the functional setter so concurrent calls each see the
      // state that was current at *their* invocation, not at render time.
      let snapshot: CartLine[] = [];
      setCartItems((prev) => {
        snapshot = prev;
        return applyAddToLines(prev, product, addBy);
      });
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId: product._id, quantity: addBy }),
        });
        if (!res.ok) throw new Error('Failed to add item to cart');
        const data = (await res.json()) as { items: CartLine[] };
        setCartItems(data.items ?? []);
        toast.success('Item added to cart');
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error adding item to cart:', error);
        toast.error('Failed to add item to cart');
      }
    },
    [isLoggedIn],
  );

  const setItemQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const next = Math.trunc(quantity);

      if (!isLoggedIn) {
        setCartItems((prev) => {
          const updated = setQuantityOnLines(prev, productId, next);
          writeGuestCart(updated);
          return updated;
        });
        return;
      }

      let snapshot: CartLine[] = [];
      setCartItems((prev) => {
        snapshot = prev;
        return setQuantityOnLines(prev, productId, next);
      });
      try {
        const res = await fetch('/api/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId, quantity: next }),
        });
        if (!res.ok) throw new Error('Failed to update quantity');
        const data = (await res.json()) as { items: CartLine[] };
        setCartItems(data.items ?? []);
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error updating quantity:', error);
        toast.error('Failed to update quantity');
      }
    },
    [isLoggedIn],
  );

  const removeItemFromCart = useCallback(
    async (productId: string) => {
      if (!isLoggedIn) {
        setCartItems((prev) => {
          const updated = removeFromLines(prev, productId);
          writeGuestCart(updated);
          return updated;
        });
        toast.success('Item removed from cart');
        return;
      }

      let snapshot: CartLine[] = [];
      setCartItems((prev) => {
        snapshot = prev;
        return removeFromLines(prev, productId);
      });
      try {
        const res = await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) throw new Error('Failed to remove item');
        const data = (await res.json()) as { items: CartLine[] };
        setCartItems(data.items ?? []);
        toast.success('Item removed from cart');
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error removing item:', error);
        toast.error('Failed to remove item from cart');
      }
    },
    [isLoggedIn],
  );

  const clearCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCartItems(() => {
        writeGuestCart([]);
        return [];
      });
      toast.success('Cart cleared');
      return;
    }

    // Logged-in: DELETE every line in parallel, then refetch to pick up the
    // canonical empty cart from the server. Optimistic clear with revert on
    // failure (any single line failing reverts the whole snapshot).
    let snapshot: CartLine[] = [];
    setCartItems((prev) => {
      snapshot = prev;
      return [];
    });
    try {
      await Promise.all(
        snapshot.map((line) =>
          fetch('/api/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId: line.product._id }),
          }).then((res) => {
            if (!res.ok) throw new Error('clear line failed');
          }),
        ),
      );
      toast.success('Cart cleared');
    } catch (error) {
      setCartItems(snapshot);
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  }, [isLoggedIn]);

  const value = useMemo<CartContextValue>(
    () => ({
      cartItems,
      cartCount: cartItems.length,
      loading,
      addItemToCart,
      removeItemFromCart,
      setItemQuantity,
      clearCart,
    }),
    [
      cartItems,
      loading,
      addItemToCart,
      removeItemFromCart,
      setItemQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return ctx;
}

export default CartContext;
