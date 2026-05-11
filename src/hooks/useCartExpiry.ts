'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCartContext } from '@/context/CartContext';

const CART_TTL_MS = 30 * 60 * 1000;
const EXPIRY_KEY = 'cartExpiresAt';

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

  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Tracks whether we've already processed the initial cartUpdatedAt for this
  // session so subsequent changes are treated as real mutations (timer reset).
  const initializedRef = useRef(false);

  // On mount: restore a stored expiry so the timer survives page navigation.
  useEffect(() => {
    const stored = localStorage.getItem(EXPIRY_KEY);
    if (!stored) return;
    const ts = parseInt(stored, 10);
    if (ts > Date.now()) {
      setExpiresAt(ts);
    } else {
      localStorage.removeItem(EXPIRY_KEY);
    }
  }, []);

  // When cart empties: tear down the timer and allow re-init on next add.
  useEffect(() => {
    if (hasItems) return;
    setExpiresAt(null);
    setSecondsLeft(null);
    setDismissed(false);
    localStorage.removeItem(EXPIRY_KEY);
    initializedRef.current = false;
  }, [hasItems]);

  // When cartUpdatedAt changes: update the expiry anchor.
  useEffect(() => {
    if (!cartUpdatedAt || !hasItems) return;

    if (!initializedRef.current) {
      // First cartUpdatedAt this session (initial server fetch or first guest
      // mutation). Prefer any still-valid stored expiry over recomputing.
      initializedRef.current = true;
      const stored = localStorage.getItem(EXPIRY_KEY);
      if (stored) {
        const storedTs = parseInt(stored, 10);
        if (storedTs > Date.now()) {
          setExpiresAt(storedTs);
          return;
        }
      }
      // No valid stored expiry — derive from when the server last touched the cart.
      const derived = cartUpdatedAt.getTime() + CART_TTL_MS;
      if (derived > Date.now()) {
        setExpiresAt(derived);
        localStorage.setItem(EXPIRY_KEY, String(derived));
      } else {
        // Cart already past its 30-minute window — clear it silently.
        localStorage.removeItem(EXPIRY_KEY);
        void clearCart({ silent: true });
      }
      return;
    }

    // Subsequent change: a real mutation happened — reset timer from now.
    const newExpiry = Date.now() + CART_TTL_MS;
    setExpiresAt(newExpiry);
    setDismissed(false);
    localStorage.setItem(EXPIRY_KEY, String(newExpiry));
  }, [cartUpdatedAt, hasItems, clearCart]);

  // Countdown tick: runs whenever expiresAt or hasItems changes.
  useEffect(() => {
    if (expiresAt === null || !hasItems) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        localStorage.removeItem(EXPIRY_KEY);
        setExpiresAt(null);
        toast.error('Your cart has expired — items have been released.');
        void clearCart({ silent: true });
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, hasItems, clearCart]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const percentLeft =
    expiresAt !== null
      ? Math.max(0, Math.min(100, ((expiresAt - Date.now()) / CART_TTL_MS) * 100))
      : 100;

  const isWarning = secondsLeft !== null && secondsLeft <= 300;

  return { secondsLeft, percentLeft, isWarning, dismissed, dismiss };
}
