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
import { MAX_PER_LINE } from '@/lib/shop-settings/config';
import { countCartItems } from '@/lib/cart/counts';
import {
  applyAddToLines,
  dedupeLines,
  removeFromLines,
  setQuantityOnLines,
} from '@/lib/cart/lines';

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
> & {
  // Deliberately optional rather than part of the Pick: guest carts persisted
  // to localStorage before this field existed won't carry it, so a missing
  // value has to mean "stock unknown" (fall back to the per-line cap) rather
  // than "zero in stock".
  stockCount?: number;
};

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
  // True when the last server fetch failed, so consumers can distinguish "cart
  // is empty" from "we don't know what's in the cart".
  loadError: boolean;
  retryLoadCart: () => void;
  addItemToCart: (item: AddItemArg, opts?: { silent?: boolean }) => Promise<void>;
  removeItemFromCart: (
    productId: string,
    opts?: { silent?: boolean },
  ) => Promise<void>;
  setItemQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: (opts?: { silent?: boolean }) => Promise<boolean>;
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
    return Array.isArray(parsed) ? dedupeLines(parsed as CartLine[]) : [];
  } catch {
    return [];
  }
};

// Warned about once per page load: a guest whose storage is blocked or full
// still sees the item land in the cart, but it won't survive a refresh, and
// silently losing a built-up cart is worse than saying so.
let warnedAboutGuestStorage = false;

const writeGuestCart = (items: CartLine[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    if (!warnedAboutGuestStorage) {
      warnedAboutGuestStorage = true;
      toast.error(
        "Your browser is blocking storage — your cart won't survive a refresh.",
      );
    }
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

// The API's envelope messages are already written for customers ("Only 6 in
// stock") and pass straight through. The two that aren't: a 401, which arrives
// as the bare word "Unauthorized", and a dropped connection, where fetch
// rejects with a TypeError whose message is "Failed to fetch". Both used to be
// shown verbatim, and the 401 left the drawer looking functional while every
// press failed with no hint that signing in again was the fix.
const SESSION_EXPIRED = 'Your session expired — sign in again to keep your cart.';
const NETWORK_DOWN =
  "Couldn't reach the shop — check your connection and try again.";

const cartRequestError = async (
  res: Response,
  fallback: string,
): Promise<Error> => {
  if (res.status === 401) return new Error(SESSION_EXPIRED);
  const err = (await res.json().catch(() => null)) as { message?: string } | null;
  return new Error(err?.message ?? fallback);
};

const cartToastMessage = (error: unknown, fallback: string): string => {
  if (error instanceof TypeError) return NETWORK_DOWN;
  return error instanceof Error ? error.message : fallback;
};

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
  const [loadError, setLoadError] = useState(false);

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

  // Cart mutations run one at a time.
  //
  // Every mutation sends an ABSOLUTE quantity and then overwrites state from
  // the response echo. With two in flight — two fast stepper clicks — the
  // older echo can land last: the quantity regresses to a value the customer
  // already changed, or a line added second vanishes from the screen while it
  // is still on the server. That last one reaches the charge, because checkout
  // builds the order from the *server* cart while the summary renders this
  // state, so the customer can pay for a line their summary never showed.
  //
  // Serialising rather than sequence-numbering the responses is deliberate. A
  // latest-wins token guarantees the newest response wins, not that it is
  // right: two requests can take different pooled connections and reach the
  // server in the opposite order, so even the newest echo can describe a cart
  // that never saw the other mutation. One request at a time removes the
  // reordering instead of trying to detect it.
  //
  // Only the network phase queues. Optimistic updates still apply
  // synchronously before the task is enqueued, so the UI stays immediate and
  // the queue is invisible.
  const mutationChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const mutationSeqRef = useRef(0);

  const runCartMutation = useCallback(
    <T,>(task: (isLatest: () => boolean) => Promise<T>): Promise<T> => {
      const seq = (mutationSeqRef.current += 1);
      const isLatest = () => seq === mutationSeqRef.current;
      const next = mutationChainRef.current.then(() => task(isLatest));
      // The chain must survive a rejecting task, or one failed mutation would
      // wedge every later one. Callers still see their own rejection via
      // `next`; this branch only keeps the queue moving.
      mutationChainRef.current = next.catch(() => undefined);
      return next;
    },
    [],
  );

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
      setCartItems(dedupeLines(data.items ?? []));
      setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
      setLoadError(false);
      clearGuestCart();
    } catch (error) {
      // Surfaced so the drawer can say "we couldn't load your cart" instead of
      // rendering the empty state, which told customers with items on the
      // server that their cart was empty.
      setLoadError(true);
      console.error('Error loading cart:', error);
    } finally {
      hydratingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Merge any local guest cart into the server cart, then refetch the result.
  // Runs once when the user transitions from unauthenticated to authenticated.
  //
  // Lines are POSTed sequentially, not in parallel: each one load-then-saves
  // the same cart doc, so concurrent writes conflict.
  //
  // A refused line used to be console.error'd and then destroyed — the guest
  // key was cleared unconditionally and the success toast fired even when
  // every line had failed. A cut that sold out while the shopper was deciding
  // vanished under "Your cart has been saved to your account". Refusals are
  // now counted, the refused lines are kept, and the toast says what actually
  // happened, in the same three-branch shape the admin bulk actions use.
  const mergeGuestCartIntoServer = useCallback(async () => {
    const guestLines = readGuestCart();
    if (guestLines.length === 0) {
      await fetchServerCart();
      return;
    }
    setLoading(true);
    try {
      const refused: CartLine[] = [];
      let firstReason: string | null = null;

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
            // The API's messages are already written for customers ("Only 6
            // in stock"), so the first one becomes the toast's reason.
            const body = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            firstReason ??= res.status === 401 ? SESSION_EXPIRED : body?.message ?? null;
            refused.push(line);
            console.error('[cart merge] line refused', line.product?._id, res.status);
          }
        } catch (err) {
          firstReason ??= NETWORK_DOWN;
          refused.push(line);
          console.error('[cart merge] line failed', line.product?._id, err);
        }
      }

      // Order matters: a successful fetch clears the guest key, so the kept
      // lines have to be written back after it rather than before.
      await fetchServerCart();
      if (refused.length > 0) writeGuestCart(refused);

      const saved = guestLines.length - refused.length;
      if (refused.length === 0) {
        toast.success('Your cart has been saved to your account');
      } else if (saved === 0) {
        toast.error(firstReason ?? "We couldn't save your cart to your account.");
      } else {
        toast.error(
          `Saved ${saved} of ${guestLines.length} items — ${refused.length} couldn't be added.`,
        );
      }
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
        // Computed from the `cartItems` closure on purpose. The logged-in
        // branch below reads `prev` inside a functional setter, and copying
        // that here does not work: React runs updater functions during render,
        // not at dispatch, so a value assigned inside one is still empty on the
        // next line — `writeGuestCart` persisted `[]` and every guest add wiped
        // the stored cart, visible only after a refresh. (The `snapshot`
        // capture below is safe because it is read after an await.)
        //
        // The cost is that two guest mutations dispatched inside one render
        // window lose the first; human-paced clicks re-render in between, so
        // that stays parked rather than traded for losing the cart entirely.
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
      await runCartMutation(async (isLatest) => {
        try {
          const res = await fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId: product._id, quantity: addBy }),
          });
          if (!res.ok) throw await cartRequestError(res, 'Failed to add item to cart');
          const data = (await res.json()) as CartApiResponse;
          setCartItems(dedupeLines(data.items ?? []));
          setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
          // A successful round trip proves the server is reachable, so a stale
          // load failure must not keep claiming the cart couldn't be loaded —
          // otherwise emptying the cart after a recovered failure shows the
          // error panel instead of the empty state.
          setLoadError(false);
          if (!silent) toast.success('Item added to cart');
        } catch (error) {
          // Only the newest mutation may revert. An older failure's snapshot
          // predates a newer mutation's optimistic update, so restoring it
          // would wipe a change the customer has already made and the newer
          // request is about to confirm.
          if (isLatest()) setCartItems(snapshot);
          console.error('Error adding item to cart:', error);
          toast.error(cartToastMessage(error, 'Failed to add item to cart'));
        }
      });
    },
    [isLoggedIn, cartItems, runCartMutation],
  );

  const setItemQuantity = useCallback(
    async (productId: string, quantity: number) => {
      // NaN fails every comparison, so an unguarded one slips past the `<= 0`
      // removal check and `JSON.stringify` puts it on the wire as `null`.
      // Reading it as 0 removes the line, which is what any caller asking for
      // "no usable quantity" means. Unreachable from the bounded steppers that
      // call this today.
      const next = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;

      if (!isLoggedIn) {
        // Closure read, not a functional setter — see addItemToCart above.
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
      await runCartMutation(async (isLatest) => {
        try {
          const res = await fetch('/api/cart', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId, quantity: next }),
          });
          if (!res.ok) throw await cartRequestError(res, 'Failed to update quantity');
          const data = (await res.json()) as CartApiResponse;
          setCartItems(dedupeLines(data.items ?? []));
          setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
          // A successful round trip proves the server is reachable, so a stale
          // load failure must not keep claiming the cart couldn't be loaded —
          // otherwise emptying the cart after a recovered failure shows the
          // error panel instead of the empty state.
          setLoadError(false);
        } catch (error) {
          if (isLatest()) setCartItems(snapshot);
          console.error('Error updating quantity:', error);
          toast.error(cartToastMessage(error, 'Failed to update quantity'));
        }
      });
    },
    [isLoggedIn, cartItems, runCartMutation],
  );

  const removeItemFromCart = useCallback(
    async (productId: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!isLoggedIn) {
        // Closure read, not a functional setter — see addItemToCart above.
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
      await runCartMutation(async (isLatest) => {
        try {
          const res = await fetch('/api/cart', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId }),
          });
          if (!res.ok) throw await cartRequestError(res, 'Failed to remove item');
          const data = (await res.json()) as CartApiResponse;
          setCartItems(dedupeLines(data.items ?? []));
          setCartUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
          // A successful round trip proves the server is reachable, so a stale
          // load failure must not keep claiming the cart couldn't be loaded —
          // otherwise emptying the cart after a recovered failure shows the
          // error panel instead of the empty state.
          setLoadError(false);
          if (!silent) toast.success('Item removed from cart');
        } catch (error) {
          if (isLatest()) setCartItems(snapshot);
          console.error('Error removing item:', error);
          toast.error(cartToastMessage(error, 'Failed to remove item from cart'));
        }
      });
    },
    [isLoggedIn, cartItems, runCartMutation],
  );

  const resetCartLocal = useCallback(() => {
    setCartItems([]);
    setCartUpdatedAt(null);
    clearGuestCart();
  }, []);

  // Resolves to whether the cart actually cleared, so callers that announce the
  // outcome (the expiry timer) can't claim a release that failed.
  const clearCart = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

    if (!isLoggedIn) {
      writeGuestCart([]);
      setCartItems([]);
      setCartUpdatedAt(null);
      if (!silent) toast.success('Cart cleared');
      return true;
    }

    // Logged-in: single atomic DELETE (no body = clear all) avoids concurrent
    // write conflicts that occur when deleting each line in parallel.
    let snapshot: CartLine[] = [];
    setCartItems((prev) => {
      snapshot = prev;
      return [];
    });
    let updatedAtSnapshot: Date | null = null;
    setCartUpdatedAt((prev) => {
      updatedAtSnapshot = prev;
      return null;
    });
    return runCartMutation(async (isLatest) => {
      try {
        const res = await fetch('/api/cart', {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) throw await cartRequestError(res, 'Failed to clear cart');
        if (!silent) toast.success('Cart cleared');
        return true;
      } catch (error) {
        if (isLatest()) {
          setCartItems(snapshot);
          // Restore the original timestamp rather than stamping now: a fresh
          // `new Date()` here re-anchored a full 30-minute reservation off the
          // back of a failure, so an offline cart never actually expired — it
          // just looped.
          setCartUpdatedAt(updatedAtSnapshot);
        }
        console.error('Error clearing cart:', error);
        toast.error(cartToastMessage(error, 'Failed to clear cart'));
        return false;
      }
    });
  }, [isLoggedIn, runCartMutation]);

  const value = useMemo<CartContextValue>(
    () => ({
      cartItems,
      cartCount: countCartItems(cartItems),
      cartUpdatedAt,
      loading,
      loadError,
      retryLoadCart: fetchServerCart,
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
      loadError,
      fetchServerCart,
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
