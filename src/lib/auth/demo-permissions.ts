import { NextResponse } from 'next/server';

// Shape both `session.user` and a User document (or a thin projection of one)
// satisfy. Most callers will pass a session user or a lean Mongoose doc; the
// `Pick`-friendly shape keeps the helper trivially typeable from either side.
type DemoCheckable = {
  isDemo?: boolean | null;
  isAdmin?: boolean | null;
};

const DEMO_ACTOR_MESSAGE = 'This action is disabled for demo accounts.';
const DEMO_TARGET_MESSAGE =
  'Demo accounts are managed by the system and cannot be modified.';

export const isDemoUser = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo);

export const isDemoCustomer = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo) && !user?.isAdmin;

export const isDemoAdmin = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo) && Boolean(user?.isAdmin);

// Returns a 403 NextResponse when the *acting* user is a demo account.
// Used to guard the demo customer's own self-serve actions — change email,
// change password, delete account, detach saved card. Callers do:
//
//   const blocked = refuseDemoActor(sessionUser.user);
//   if (blocked) return blocked;
//
// Returns null when the actor is not a demo account, leaving the route to
// proceed normally. Matches the existing return-early pattern in this
// codebase's api-handler wrapper — no try/catch wiring required.
export const refuseDemoActor = (
  user?: DemoCheckable | null,
): NextResponse | null =>
  isDemoUser(user)
    ? NextResponse.json({ message: DEMO_ACTOR_MESSAGE }, { status: 403 })
    : null;

// Returns a 403 NextResponse when the *target* user (looked up by id by the
// caller) is a demo account. Used by admin endpoints to refuse hard-delete,
// soft-delete, restore, etc. on either seeded demo account — regardless of
// who's calling. Returns null when the target is not a demo account.
export const refuseDemoTarget = (
  target?: DemoCheckable | null,
): NextResponse | null =>
  isDemoUser(target)
    ? NextResponse.json({ message: DEMO_TARGET_MESSAGE }, { status: 403 })
    : null;
