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

const CART_TTL_MS = 30 * 60 * 1000;
const EXPIRY_KEY = 'cartExpiresAt';

// expiresAt lives in localStorage so the cart timer survives page navigation and
// stays consistent across tabs. A module-level subscription set notifies React
// readers via useSyncExternalStore whenever the value changes.
const expiryListeners = new Set<() => void>();

function subscribeExpiry(listener: () => void) {
  expiryListeners.add(listener);
  return () => {
    expiryListeners.delete(listener);
  };
}

function getStoredExpiry(): number | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(EXPIRY_KEY);
  if (!stored) return null;
  const ts = parseInt(stored, 10);
  return Number.isFinite(ts) ? ts : null;
}

function getServerExpiry(): number | null {
  return null;
}

function setStoredExpiry(value: number | null) {
  if (typeof window === 'undefined') return;
  if (value === null) {
    window.localStorage.removeItem(EXPIRY_KEY);
  } else {
    window.localStorage.setItem(EXPIRY_KEY, String(value));
  }
  expiryListeners.forEach((l) => l());
}

export type CartExpiryState = {
  secondsLeft: number | null;
  percentLeft: number;
  isWarning: boolean;
  dismissed: boolean;
  dismiss: () => void;
};

export function useCartExpiry(): CartExpiryState {
  const { cartItems, cartUpdatedAt, clearCart } = useCartContext();
  const hasItems = cartItems.length > 0;

  // expiresAt is sourced from localStorage; React state is for the tick clock
  // and the per-anchor dismissal flag.
  const expiresAt = useSyncExternalStore(
    subscribeExpiry,
    getStoredExpiry,
    getServerExpiry,
  );

  const [now, setNow] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : Date.now(),
  );

  // dismissed is keyed by the anchor it was dismissed against — when the anchor
  // changes (new cart mutation), the warning re-appears automatically without a
  // reset effect.
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);

  // Tracks whether we've already processed the initial cartUpdatedAt for this
  // session so subsequent changes are treated as real mutations (timer reset).
  const initializedRef = useRef(false);

  // Tick the clock once per second while the timer is live.
  useEffect(() => {
    if (expiresAt === null || !hasItems) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, hasItems]);

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
        void clearCart({ silent: true });
      }
      return;
    }

    // Subsequent change: a real mutation happened — reset timer from now.
    setStoredExpiry(Date.now() + CART_TTL_MS);
  }, [cartUpdatedAt, hasItems, clearCart]);

  // Cleanup when the timer crosses zero.
  useEffect(() => {
    if (expiresAt === null || !hasItems) return;
    if (now < expiresAt) return;
    setStoredExpiry(null);
    toast.error('Your cart has expired — items have been released.');
    void clearCart({ silent: true });
  }, [now, expiresAt, hasItems, clearCart]);

  const dismiss = useCallback(() => {
    setDismissedFor(expiresAt);
  }, [expiresAt]);

  const secondsLeft =
    expiresAt === null || !hasItems || now === 0
      ? null
      : Math.max(0, Math.ceil((expiresAt - now) / 1000));

  const percentLeft =
    expiresAt !== null && now > 0
      ? Math.max(0, Math.min(100, ((expiresAt - now) / CART_TTL_MS) * 100))
      : 100;

  const isWarning = secondsLeft !== null && secondsLeft <= 300;
  const dismissed = dismissedFor !== null && dismissedFor === expiresAt;

  return { secondsLeft, percentLeft, isWarning, dismissed, dismiss };
}
