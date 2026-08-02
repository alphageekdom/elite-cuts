// Which ownerless orders a given email is entitled to claim.
//
// Two consumers, and they must not drift:
//
//   1. `claimGuestOrdersForUser` — attaches these to a newly-registered account.
//   2. `hardDeleteUser`'s second anonymisation pass — seals exactly the same set
//      against a departing customer's email.
//
// The invariant is that (2) can reach everything (1) can. If the two ever
// disagree, an order becomes claimable but unsealable, which is the bug this
// whole module exists to prevent — so the definition lives in one place and
// both sides call it. That, not testability, is why this is its own file: an
// earlier version of this comment claimed the split was forced by vitest being
// unable to import a server-only module, which is false. Nine test files here
// already mock `connectDB` and seven mock `server-only`; `claim-guest.ts`
// doesn't even import the latter. Both consumers are tested directly.
//
// The exclusion is the whole point. `hardDeleteUser` anonymises a departing
// customer's orders by setting `user: null` and copying their real email into
// `guestContact.email` — byte-for-byte the shape a genuine guest checkout
// leaves behind. Without a discriminator, registering a purged customer's email
// inherited their entire order history: line items, totals, pickup history and
// the name/email/phone on the rows. No email verification exists anywhere in
// this app, so the only friction was the register route's per-IP throttle.
//
// `anonymisedAt: null` is an equality match on null, which in MongoDB matches
// documents where the field is null OR entirely absent. That is the deliberate,
// safe direction for existing data: every order written before this field
// existed has it absent, so genuine guests keep claiming exactly as before and
// no historic row is retroactively locked out. Only rows the anonymiser stamps
// from here on are excluded.
//
// That direction was verified against the live database rather than assumed:
// zero hard-delete audit rows have ever been written, and none of the currently
// claimable orders carries a member-only field (`memberDiscount`,
// `pointsRedeemed`, `pointsAwarded`, `saveCardIntent`) that a genuine guest
// checkout could not have. So there is no purge residue to back-stamp.
//
// The alternative spellings do NOT behave the same and should not be swapped
// in: `{ $exists: false }` stops matching the moment a row gets an explicit
// null, and no `$ne` form can express "never stamped" against a missing field.
export function guestOrderClaimFilter(normalizedEmail: string) {
  return {
    user: null,
    'guestContact.email': normalizedEmail,
    anonymisedAt: null,
  };
}
