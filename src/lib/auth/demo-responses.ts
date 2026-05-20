import { NextResponse } from 'next/server';

import { isDemoUser, type DemoCheckable } from './demo-permissions';

// 403 response builders for refusing a request that touches a demo account.
// Server-only because they construct `NextResponse` instances — kept apart
// from `demo-permissions.ts` so the pure predicates over there stay safe to
// import from client components.

// Exported so the test file (and any caller that wants to assert against
// the wire copy) has one source of truth. The strings themselves are part
// of the public contract — a client toast may match against them.
export const DEMO_ACTOR_MESSAGE =
  'This action is disabled for demo accounts.';
export const DEMO_TARGET_MESSAGE =
  'Demo accounts are managed by the system and cannot be modified.';

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
