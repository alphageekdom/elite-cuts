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
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { unitPrice } from '@/lib/products/pricing';

// Minimum product fields a cart line needs to render. `_id` keys the line,
// name + images + category drive the card UI; the Phase 1 display labels
// + `isEstimatedPrice` flag let cart rows render proper "/lb" / "1 lb pack"
// copy and let the cart switch its total label to "Estimated Total" when
// any line is variable-weight. The canonical per-type pricing fields tag
// along so `unitPrice` can recompute the snapshot if a line is restored
// from localStorage without one (legacy guest carts).
export type CartLineProduct = Pick<
  SerializedProduct,
  | '_id'
  | 'name'
  | 'price'
  | 'images'
  | 'category'
  | 'pricingType'
  | 'displayPriceLabel'
  | 'displayWeightLabel'
  | 'isEstimatedPrice'
  | 'packagePrice'
  | 'packageWeightLb'
  | 'pricePerLb'
  | 'estimatedWeightLb'
  | 'averageWeightLb'
  | 'minWeightLb'
  | 'maxWeightLb'
  | 'unitPrice'
  | 'bundlePrice'
  | 'includedItems'
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

// Wire shape returned by every /api/cart endpoint. `updatedAt` anchors the
// 30-minute reservation timer to the canonical server timestamp.
type CartApiResponse = { items: CartLine[]; updatedAt: string | null };

type CartContextValue = {
  cartItems: CartLine[];
  cartCount: number;
  cartUpdatedAt: Date | null;
  loading: boolean;
  addItemToCart: (item: AddItemArg, opts?: { silent?: boolean }) => Promise<void>;
  removeItemFromCart: (
    productId: string,
    opts?: { silent?: boolean },
  ) => Promise<void>;
  setItemQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: (opts?: { silent?: boolean }) => Promise<void>;
  // Local-only reset for flows where the server cart is already known to be
  // empty (e.g. immediately after a successful order). Skips the DELETE call
  // so we don't race a failed network reply into a snapshot-restore that puts
  // the just-purchased items back on screen.
  resetCartLocal: () => void;
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
// line snapshots the product's per-unit estimated price so totals stay
// stable even if the catalog price changes mid-session — and so per-lb
// cuts compute the right line estimate (pricePerLb × estimatedWeightLb)
// rather than the bare per-lb rate.
const applyAddToLines = (
  lines: CartLine[],
  product: CartLineProduct,
  addBy: number,
): CartLine[] => {
  const idx = lines.findIndex((l) => l.product._id === product._id);
  if (idx === -1) {
    return [...lines, { product, quantity: addBy, price: unitPrice(product, product.price) }];
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
  const [cartUpdatedAt, setCartUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Tracks the previous auth status across renders so we can detect the
  // unauthenticated → authenticated transition and run merge-on-login exactly
  // once. Re-running the merge on hot reload or tab focus would double-count.
  // On a hard refresh while authenticated the ref starts as 'loading', which
  // intentionally falls through to fetchServerCart rather than the merge path
  // — there's no guest cart to merge in that case.
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
      const data = (await res.json()) as CartApiResponse;
      setCartItems(data.items ?? []);
      setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
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
          if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`status ${res.status}: ${body || res.statusText}`);
          }
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
  //
  // Gating on `session?.user` rather than `status` alone handles the
  // tombstoned-token case: after an admin soft-delete the cookie is still
  // valid (status stays 'authenticated') but the server returns a session
  // with no user, so any /api/cart fetch would 401 in a loop. Treat that
  // shape as the guest branch.
  const hasUser = Boolean(session?.user);
  useEffect(() => {
    if (status === 'loading') return;

    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status === 'authenticated' && hasUser) {
      if (prev === 'unauthenticated') {
        void mergeGuestCartIntoServer();
      } else {
        void fetchServerCart();
      }
      return;
    }
    // Guest (or tombstoned session): sync from localStorage and clear the
    // loading flag. Defer to a task tick so the setState lands async
    // (rule-clean); the one-tick gap is invisible to users.
    const id = setTimeout(() => {
      setCartItems(readGuestCart());
      setLoading(false);
    }, 0);
    return () => clearTimeout(id);
  }, [status, hasUser, fetchServerCart, mergeGuestCartIntoServer]);

  const addItemToCart = useCallback(
    async (item: AddItemArg, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!item?._id) {
        toast.error('Product not available');
        return;
      }
      const addBy = Math.max(1, Math.trunc(item.quantity ?? 1) || 1);
      const { quantity: _quantity, ...productOnly } = item;
      const product = productOnly as CartLineProduct;

      // Pre-flight cap check so the user sees the limit immediately rather than
      // after a server round-trip. The server enforces the same cap as a backstop.
      const existing = cartItems.find((l) => l.product._id === product._id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty + addBy > MAX_PER_LINE) {
        toast.error(`Limit ${MAX_PER_LINE} per item`);
        return;
      }

      if (!isLoggedIn) {
        const next = applyAddToLines(cartItems, product, addBy);
        writeGuestCart(next);
        setCartItems(next);
        setCartUpdatedAt(new Date());
        if (!silent) toast.success('Item added to cart');
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
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(err?.message ?? 'Failed to add item to cart');
        }
        const data = (await res.json()) as CartApiResponse;
        setCartItems(data.items ?? []);
        setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
        if (!silent) toast.success('Item added to cart');
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error adding item to cart:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to add item to cart');
      }
    },
    [isLoggedIn, cartItems],
  );

  const setItemQuantity = useCallback(
    async (productId: string, quantity: number) => {
      const next = Math.trunc(quantity);

      if (!isLoggedIn) {
        const updated = setQuantityOnLines(cartItems, productId, next);
        writeGuestCart(updated);
        setCartItems(updated);
        setCartUpdatedAt(new Date());
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
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { message?: string } | null;
          throw new Error(err?.message ?? 'Failed to update quantity');
        }
        const data = (await res.json()) as CartApiResponse;
        setCartItems(data.items ?? []);
        setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error updating quantity:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update quantity');
      }
    },
    [isLoggedIn, cartItems],
  );

  const removeItemFromCart = useCallback(
    async (productId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!isLoggedIn) {
        const updated = removeFromLines(cartItems, productId);
        writeGuestCart(updated);
        setCartItems(updated);
        setCartUpdatedAt(new Date());
        if (!silent) toast.success('Item removed from cart');
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
        const data = (await res.json()) as CartApiResponse;
        setCartItems(data.items ?? []);
        setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
        if (!silent) toast.success('Item removed from cart');
      } catch (error) {
        setCartItems(snapshot);
        console.error('Error removing item:', error);
        toast.error('Failed to remove item from cart');
      }
    },
    [isLoggedIn, cartItems],
  );

  const resetCartLocal = useCallback(() => {
    setCartItems([]);
    setCartUpdatedAt(null);
    clearGuestCart();
  }, []);

  const clearCart = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!isLoggedIn) {
      writeGuestCart([]);
      setCartItems([]);
      setCartUpdatedAt(null);
      if (!silent) toast.success('Cart cleared');
      return;
    }

    // Logged-in: single atomic DELETE (no body = clear all) avoids concurrent
    // write conflicts that occur when deleting each line in parallel.
    let snapshot: CartLine[] = [];
    setCartItems((prev) => {
      snapshot = prev;
      return [];
    });
    setCartUpdatedAt(null);
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to clear cart');
      if (!silent) toast.success('Cart cleared');
    } catch (error) {
      setCartItems(snapshot);
      setCartUpdatedAt(new Date());
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  }, [isLoggedIn]);

  const value = useMemo<CartContextValue>(
    () => ({
      cartItems,
      cartCount: cartItems.length,
      cartUpdatedAt,
      loading,
      addItemToCart,
      removeItemFromCart,
      setItemQuantity,
      clearCart,
      resetCartLocal,
    }),
    [
      cartItems,
      cartUpdatedAt,
      loading,
      addItemToCart,
      removeItemFromCart,
      setItemQuantity,
      clearCart,
      resetCartLocal,
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
