'use client';

import { useEffect, useState } from 'react';

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
 */
export function useSignInLockout(): SignInLockout {
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState<number | null>(null);

  // Restore any in-flight lockout from a previous render of this tab.
  useEffect(() => {
    const stored = sessionStorage.getItem(LOCKOUT_KEY);
    if (!stored) return;
    const ts = parseInt(stored, 10);
    if (ts > Date.now()) {
      setLockedUntil(ts);
    } else {
      sessionStorage.removeItem(LOCKOUT_KEY);
    }
  }, []);

  // Countdown tick — drives the button label and clears the lockout when it
  // expires. Tearing down the interval on every `lockedUntil` change is fine
  // since the lockout only flips during sign-in submissions.
  useEffect(() => {
    if (lockedUntil === null) {
      setLockSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockSecondsLeft(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        sessionStorage.removeItem(LOCKOUT_KEY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const registerLockoutFromMessage = (message: string | undefined): boolean => {
    if (!message || !message.startsWith(LOCKOUT_MESSAGE_PREFIX)) return false;
    const match = message.match(LOCKOUT_RE);
    const minutes = match ? parseInt(match[1], 10) : 60;
    const until = Date.now() + minutes * 60 * 1000;
    sessionStorage.setItem(LOCKOUT_KEY, String(until));
    setLockedUntil(until);
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
