// Day counts for the account-deletion lifecycle, in their own leaf module.
//
// Both numbers are quoted in customer-facing copy — the Privacy page's deletion
// and dormancy sections, the profile's delete dialog, and the "deletion
// scheduled" banner. Those consumers only need the integers, but the modules
// that *use* them are heavy: `account-deletion.ts` imports connectDB and eight
// Mongoose models, and `jobs/dormancyScan.ts` imports all of that plus more. A
// page or a client component importing either one for a single number drags the
// whole graph along with it.
//
// Same split, and same reason, as `lib/shop-settings/constants.ts`: the values
// live in a leaf that anything can import, and the modules that operate on
// them import from here like everyone else.

/**
 * How long a soft-deleted account stays recoverable before the purge cron
 * erases it. Signing back in during this window cancels the deletion.
 */
export const ACCOUNT_DELETION_GRACE_DAYS = 30;

/**
 * How long a dormancy-warned account is left alone before the scan soft-deletes
 * it. Any sign-in or order placed in the meantime clears the warning.
 */
export const DORMANCY_FOLLOWUP_DAYS = 30;

/**
 * Display name left on the orders, reviews and messages a hard-deleted
 * customer leaves behind. Lives here rather than in `account-deletion.ts`
 * for the same reason as the day counts above: the two surfaces that RENDER
 * it (the product page's review list and the admin message mapper) would
 * otherwise drag eight Mongoose models in for one string — which is why both
 * hardcoded the literal instead, and could drift from what the cascade
 * actually writes.
 */
export const FORMER_CUSTOMER_NAME = 'Former customer';
