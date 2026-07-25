// How long a session survives, and whether the "Keep me signed in" checkbox
// on the sign-in form has any bearing on it.
//
// Before this module the checkbox was decorative: its value never reached
// `signIn`, and no `session.maxAge` was configured, so every session ran on
// NextAuth's 30-day default whether the box was ticked or not.
//
// The honest version of an unticked box is a *session cookie* that dies when
// the browser closes. NextAuth's JWT strategy can't express that — the cookie's
// max-age is static config, not something a callback can vary per sign-in — so
// an unticked box gets a short absolute window instead. The cookie still
// outlives it on disk, but the token reads as expired and the session callback
// tombstones it, which is the same mechanism the soft-delete re-check uses.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Ticked. Matches the previous default exactly, so a customer who ticks the
// box sees no change from how the app behaved before.
export const REMEMBERED_SESSION_DAYS = 30;

// Unticked. Long enough to cover a day's shopping without a re-login mid-
// checkout, short enough that a shared or borrowed machine isn't left signed
// in for a month.
export const UNREMEMBERED_SESSION_HOURS = 12;

// The cookie's own max-age, in seconds — NextAuth wants seconds here while the
// token timestamps below are unix-ms. It has to be the *longest* lifetime any
// session can have, since a shorter cookie would log a remembered user out
// early and a longer one just leaves a token that reads as expired.
export const SESSION_COOKIE_MAX_AGE_SECONDS =
  (REMEMBERED_SESSION_DAYS * DAY_MS) / 1000;

// Absolute unix-ms deadline for a session started at `now`. Stamped on the
// token once at sign-in and never extended — this is a fixed ceiling, not an
// idle timeout, so an active user is still signed out at the deadline.
export function resolveSessionExpiry(rememberMe: boolean, now: number): number {
  return (
    now +
    (rememberMe
      ? REMEMBERED_SESSION_DAYS * DAY_MS
      : UNREMEMBERED_SESSION_HOURS * HOUR_MS)
  );
}

// A token with no deadline pre-dates this module — treat it as live rather
// than logging out every customer holding a cookie from before the deploy.
export function isSessionExpired(
  expiresAt: number | undefined,
  now: number,
): boolean {
  if (typeof expiresAt !== 'number') return false;
  return now >= expiresAt;
}

// Reads the "Keep me signed in" choice out of submitted credentials.
//
// Credentials cross the wire as strings, so the checkbox arrives as "true" or
// "false" rather than a boolean.
//
// **Absent means the surface never offered the choice**, and falls back to the
// remembered lifetime — which is what every session got before this module
// existed. Only the sign-in form has the checkbox; `Register` signs the
// customer in after an account restore and `CheckoutInlineSignIn` signs them in
// mid-checkout, both with no checkbox anywhere on screen. Reading their silence
// as "unticked" would have quietly cut those two flows from 30 days to 12 hours
// without anyone asking for it.
//
// A value that *is* present but isn't what the checkbox posts is treated as
// unticked. That's either tampering or a bug, and the shorter session is the
// safer way to be wrong.
export function resolveRememberMe(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  return value === 'true' || value === true;
}
