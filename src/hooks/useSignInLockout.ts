'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

// sessionStorage key used by every sign-in surface so the cool-down can't be
// bypassed by switching pages mid-lockout. The backend is the source of
// truth for whether the user is actually rate-limited — this hook only
// drives the UI countdown so the user can see when they'll be allowed to
// try again.
const LOCKOUT_KEY = 'loginLockoutUntil';

// Backend phrase that signals a rate-limit response. Anything else from
// next-auth's `signIn` is treated as an ordinary credential error.
const LOCKOUT_MESSAGE_PREFIX = 'Too many failed login attempts';

// Pulls the lockout duration in minutes out of the backend message so the
// countdown picks the right end-time even when the backend's window changes.
const LOCKOUT_RE = /Try again in (\d+) minute/;

// Module-level subscriber set so a registerLockoutFromMessage call from one
// mounted instance notifies any other instance reading the same key.
const lockoutListeners = new Set<() => void>();
const subscribeLockout = (listener: () => void) => {
  lockoutListeners.add(listener);
  return () => {
    lockoutListeners.delete(listener);
  };
};

const readClientLockout = (): number | null => {
  const stored = window.sessionStorage.getItem(LOCKOUT_KEY);
  if (!stored) return null;
  const ts = parseInt(stored, 10);
  if (!Number.isFinite(ts) || ts <= Date.now()) {
    window.sessionStorage.removeItem(LOCKOUT_KEY);
    return null;
  }
  return ts;
};

const readServerLockout = (): number | null => null;

const writeLockout = (value: number | null) => {
  if (value === null) {
    window.sessionStorage.removeItem(LOCKOUT_KEY);
  } else {
    window.sessionStorage.setItem(LOCKOUT_KEY, String(value));
  }
  lockoutListeners.forEach((l) => l());
};

export type SignInLockout = {
  /** True while the cool-down is active; disables form inputs + buttons */
  isLocked: boolean;
  /** Seconds remaining; null when not locked. Use with formatLockoutCountdown */
  lockSecondsLeft: number | null;
  /**
   * Inspect a next-auth `signIn` error string and, if it's a rate-limit
   * response, set the cool-down. Returns true when a lockout was registered
   * so the caller can suppress its generic "invalid credentials" toast.
   */
  registerLockoutFromMessage: (message: string | undefined) => boolean;
};

/**
 * Shared sign-in cool-down hook used by `/login` and the inline checkout
 * sign-in panel. The lockout is persisted in sessionStorage so a refresh
 * keeps the user disabled until the backend agrees the cool-down has elapsed.
 * The stored value is read through useSyncExternalStore so SSR returns null
 * (matching the server) and the client-only timestamp kicks in after
 * hydration — no hydration mismatch on the disabled-button state.
 */
export function useSignInLockout(): SignInLockout {
  const lockedUntil = useSyncExternalStore(
    subscribeLockout,
    readClientLockout,
    readServerLockout,
  );
  const [now, setNow] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : Date.now(),
  );

  // Tick the clock once per second while the cool-down is active. The
  // setState calls inside the interval callback are async (rule-clean), and
  // the interval shuts itself down once the cool-down expires.
  useEffect(() => {
    if (lockedUntil === null) return;
    const id = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      if (currentNow >= lockedUntil) writeLockout(null);
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const lockSecondsLeft =
    lockedUntil === null || now === 0
      ? null
      : Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const registerLockoutFromMessage = (message: string | undefined): boolean => {
    if (!message || !message.startsWith(LOCKOUT_MESSAGE_PREFIX)) return false;
    const match = message.match(LOCKOUT_RE);
    const minutes = match ? parseInt(match[1], 10) : 60;
    writeLockout(Date.now() + minutes * 60 * 1000);
    return true;
  };

  return {
    isLocked: lockSecondsLeft !== null && lockSecondsLeft > 0,
    lockSecondsLeft,
    registerLockoutFromMessage,
  };
}

/** Render `seconds` as `M:SS` for the locked-out button label. */
export function formatLockoutCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
