// Pure predicates for inspecting a user-shaped object's demo flags. No
// `next/server` import — these are importable from client components (e.g.
// `DemoResetCard.tsx` reads `isDemoAdmin(session.user)` to hide itself from
// a demo-admin session). The matching 403 response builders live next door
// in `demo-responses.ts` and stay server-only.

// Shape both `session.user` and a User document (or a thin projection of
// one) satisfy. Most callers will pass a session user or a lean Mongoose
// doc; the `Pick`-friendly shape keeps the helper trivially typeable from
// either side.
export type DemoCheckable = {
  isDemo?: boolean | null;
  isAdmin?: boolean | null;
};

export const isDemoUser = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo);

export const isDemoCustomer = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo) && !user?.isAdmin;

export const isDemoAdmin = (user?: DemoCheckable | null): boolean =>
  Boolean(user?.isDemo) && Boolean(user?.isAdmin);
