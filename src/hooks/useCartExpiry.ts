'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { toast } from 'sonner';
import { useCartContext } from '@/context/CartContext';

// The reservation window, shared so the countdown and any copy quoting the
// figure ("held for 30 minutes") can't drift apart.
export const CART_TTL_MS = 30 * 60 * 1000;
export const CART_TTL_MINUTES = CART_TTL_MS / 60_000;

const EXPIRY_KEY = 'cartExpiresAt';

// "12:41". Shared by the global banner and the drawer's own chip so the two
// countdowns on screen at once can't format the same second differently.
export function formatSecondsClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// expiresAt lives in localStorage so the cart timer survives page navigation.
// A module-level subscription set notifies React readers via
// useSyncExternalStore whenever *this tab* writes the value.
//
// There is deliberately no `storage` listener, so nothing pushes a change
// between tabs: the set above is per-document. A tab already running the
// one-second tick re-reads the key on each render and so converges within a
// second — but the tick only runs while that tab has both a stored expiry and
// items (see the interval below), so a tab with an empty cart never picks up
// another tab's newly-anchored timer at all until something else re-renders it.
// At expiry each ticking tab independently fires its own clear and its own
// toast. All benign, because the clear is idempotent — but it is per-tab
// behaviour, not a shared timer.
const expiryListeners = new Set<() => void>();

function subscribeExpiry(listener: () => void) {
  expiryListeners.add(listener);
  return () => {
    expiryListeners.delete(listener);
  };
}

// Both storage helpers swallow access errors the way the guest-cart helpers in
// CartContext already do. `getStoredExpiry` is the useSyncExternalStore
// snapshot, so it runs during render on every page that mounts the cart chrome
// — an unguarded throw (Chrome's "block all cookies", strict webviews) took the
// whole site down via the root error boundary, not just the cart.
function getStoredExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(EXPIRY_KEY);
    if (!stored) return null;
    const ts = parseInt(stored, 10);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function getServerExpiry(): number | null {
  return null;
}

function setStoredExpiry(value: number | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(EXPIRY_KEY);
    } else {
      window.localStorage.setItem(EXPIRY_KEY, String(value));
    }
  } catch {
    // Storage blocked or over quota — the timer degrades to the static hold
    // copy, which under-promises rather than lying.
  }
  expiryListeners.forEach((l) => l());
}

export type CartExpiryClock = {
  expiresAt: number | null;
  secondsLeft: number | null;
  percentLeft: number;
  isWarning: boolean;
};

export type CartExpiryState = CartExpiryClock & {
  dismissed: boolean;
  dismiss: () => void;
};

// Read-only view of the reservation timer: subscribes to the stored expiry and
// ticks a local clock, nothing more. Deliberately owns none of the anchoring or
// expiry cleanup — those stay in `useCartExpiry` below, which exactly one
// consumer mounts. A second reader running the full hook would fire the expiry
// toast twice and call clearCart twice when the timer crossed zero.
export function useCartExpiryClock(): CartExpiryClock {
  const { cartItems } = useCartContext();
  const hasItems = cartItems.length > 0;

  const expiresAt = useSyncExternalStore(
    subscribeExpiry,
    getStoredExpiry,
    getServerExpiry,
  );

  const [now, setNow] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : Date.now(),
  );

  // Tick the clock once per second while the timer is live.
  useEffect(() => {
    if (expiresAt === null || !hasItems) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, hasItems]);

  // Capped at the TTL: `now` only advances while the interval runs, so a timer
  // re-anchored after an idle stretch would otherwise render a remaining time
  // larger than the window the copy promises ("30:11" against a 30-minute
  // hold). The ceil also makes a freshly-anchored timer read 30:01 without it.
  const secondsLeft =
    expiresAt === null || !hasItems || now === 0
      ? null
      : Math.min(
          CART_TTL_MS / 1000,
          Math.max(0, Math.ceil((expiresAt - now) / 1000)),
        );

  const percentLeft =
    expiresAt !== null && now > 0
      ? Math.max(0, Math.min(100, ((expiresAt - now) / CART_TTL_MS) * 100))
      : 100;

  const isWarning = secondsLeft !== null && secondsLeft <= 300;

  return { expiresAt, secondsLeft, percentLeft, isWarning };
}

// Full timer: the clock above plus ownership of anchoring, expiry cleanup and
// the per-anchor dismissal flag. Mount this in exactly one place
// (CartExpiryBanner); every other reader wants `useCartExpiryClock`.
export function useCartExpiry(): CartExpiryState {
  const { cartItems, cartUpdatedAt, clearCart } = useCartContext();
  const hasItems = cartItems.length > 0;

  const clock = useCartExpiryClock();
  const { expiresAt, secondsLeft } = clock;

  // dismissed is keyed by the anchor it was dismissed against — when the anchor
  // changes (new cart mutation), the warning re-appears automatically without a
  // reset effect.
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);

  // Tracks whether we've already processed the initial cartUpdatedAt for this
  // session so subsequent changes are treated as real mutations (timer reset).
  const initializedRef = useRef(false);

  // An expiry clear that fails must not be retried against the same cart.
  //
  // Clearing empties the cart optimistically, which resets `initializedRef`
  // below. When the DELETE then fails — offline is the realistic case —
  // CartContext restores the items *and their original timestamp*, so the
  // anchor effect re-runs its first-init branch, finds no stored expiry and a
  // derived expiry already in the past, and clears again. Measured before the
  // fix: 28 attempts in 12 seconds, still climbing, one error toast each.
  //
  // (It only shows up when the failure is slow enough that the restore doesn't
  // batch with the effects that follow it. An instantly-rejecting fetch
  // terminates after two attempts, which is why this needs a real offline
  // condition — or a delayed rejection — to reproduce.)
  //
  // Keyed by the anchor rather than a plain flag: a real mutation moves
  // `cartUpdatedAt`, which should make the cart expirable again, and a fresh
  // page load starts this ref empty so a cart left behind by a failed clear is
  // still cleared once the connection is back.
  const autoClearedAnchorRef = useRef<number | null>(null);
  const claimAutoClear = useCallback((anchor: number | null): boolean => {
    if (anchor === null) return true;
    if (autoClearedAnchorRef.current === anchor) return false;
    autoClearedAnchorRef.current = anchor;
    return true;
  }, []);

  // When the cart empties: clear stored expiry and let the next add re-init.
  useEffect(() => {
    if (hasItems) return;
    setStoredExpiry(null);
    initializedRef.current = false;
  }, [hasItems]);

  // When cartUpdatedAt changes: anchor (or restore) the expiry in localStorage.
  useEffect(() => {
    if (!cartUpdatedAt || !hasItems) return;

    if (!initializedRef.current) {
      // First cartUpdatedAt this session: prefer any still-valid stored expiry,
      // otherwise derive from when the server last touched the cart.
      initializedRef.current = true;
      const stored = getStoredExpiry();
      if (stored !== null && stored > Date.now()) return;
      const derived = cartUpdatedAt.getTime() + CART_TTL_MS;
      if (derived > Date.now()) {
        setStoredExpiry(derived);
      } else {
        setStoredExpiry(null);
        // Once per anchor — see `claimAutoClear`. Without it a failed clear
        // restores this exact state and lands straight back here.
        if (claimAutoClear(cartUpdatedAt.getTime())) {
          void clearCart({ silent: true });
        }
      }
      return;
    }

    // Subsequent change: a real mutation happened — reset timer from now.
    setStoredExpiry(Date.now() + CART_TTL_MS);
  }, [cartUpdatedAt, hasItems, clearCart, claimAutoClear]);

  // Cleanup when the timer crosses zero. secondsLeft floors at 0 and goes null
  // once the stored expiry is cleared, so this can't re-fire.
  //
  // The announcement waits on the clear rather than racing it: firing first
  // meant an offline cart claimed it had been cleared while "Failed to clear
  // cart" sat beside it and every item was still listed behind them.
  useEffect(() => {
    if (secondsLeft !== 0) return;
    setStoredExpiry(null);
    // Claimed here too, so a failure doesn't hand the anchor effect above a
    // second free attempt against the same cart.
    claimAutoClear(cartUpdatedAt?.getTime() ?? null);
    void clearCart({ silent: true }).then((cleared) => {
      toast.error(
        cleared
          ? 'Your cart timed out and has been cleared.'
          : "Your cart timed out, but we couldn't clear it — check your connection.",
      );
    });
  }, [secondsLeft, clearCart, cartUpdatedAt, claimAutoClear]);

  const dismiss = useCallback(() => {
    setDismissedFor(expiresAt);
  }, [expiresAt]);

  const dismissed = dismissedFor !== null && dismissedFor === expiresAt;

  return { ...clock, dismissed, dismiss };
}
