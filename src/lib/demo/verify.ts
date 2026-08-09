import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import Message from '@/models/Message';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Promo from '@/models/Promo';
import Review from '@/models/Review';
import Shift from '@/models/Shift';
import ShopSettings from '@/models/ShopSettings';
import StaffMember from '@/models/StaffMember';
import User from '@/models/User';
import { DEMO_ADMIN_FILTER, DEMO_CUSTOMER_FILTER, demoOwnerIds } from './accounts';
import { expectedProductSlugs, expectedPromoCodes } from './natural-keys';
import { DEMO_SHOP_SETTINGS } from './seed/settings';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { DEMO_STAFF } from './seed/staff';

// ── Did the reset produce a working demo? ───────────────────────────────
// "The steps ran" and "the demo works" are different claims, and until now the
// reset only ever made the first one. Every write below it could succeed and
// still leave a demo a recruiter opens onto a half-empty catalog — a product
// whose upsert silently no-op'd, a promo the restore never reached, a staff
// roster pruned to nothing by the insert-then-delete pair.
//
// Checks are against **stable identifiers**, never counts. A count answers
// "are there 39 products" and is satisfied by 39 of the wrong ones; a slug
// answers "is `dry-aged-ribeye` on the shelf", which is the thing the demo
// actually needs. The one place a number appears (`shift:` slots) it is a
// {day, hour} coordinate, which is an identifier that happens to be numeric.
//
// Everything is batched: one query per CHECK rather than one per identifier —
// the reset is already ~110 round-trips and this must not double it. (Not one
// per collection, which is what this line used to say: `User` and `Product` are
// each read twice, for the accounts and then for the orphan resolution.)

// Returns the failing identifiers in `kind:identifier` form — a list rather
// than a boolean because the failure is the useful part: "the demo is broken"
// sends someone to read logs, `product:wagyu-striploin` sends them to the row.
//
// A bare `string[]`, not `{ failures }`. The wrapper was a single-field object
// that every caller destructured on the same line it received it.

/** Distinct set membership, preserving the caller's ordering of `expected`. */
function missing(expected: string[], present: Iterable<string>): string[] {
  const have = new Set(present);
  return expected.filter((id) => !have.has(id));
}

type DemoAccounts = {
  customer: { _id: Types.ObjectId; savedCuts?: Types.ObjectId[] };
  ownerIds: Types.ObjectId[];
};

// ── Accounts ────────────────────────────────────────────────────────────
// Both doors on /demo depend on these existing. Without the customer the reset
// early-returns and restores nothing; without the admin the whole owner-side
// half of the portfolio is unreachable.
//
// Returns `null` for `accounts` when the customer is absent, which tells the
// orchestrator below to stop: the seed has never run here, so every catalog
// identifier really is missing, and reporting all of them is true but drowns
// the one finding that is actionable.
async function checkAccounts(): Promise<{
  failures: string[];
  accounts: DemoAccounts | null;
}> {
  const [customer, admin] = await Promise.all([
    User.findOne(DEMO_CUSTOMER_FILTER).select('_id savedCuts').lean<{
      _id: Types.ObjectId;
      savedCuts?: Types.ObjectId[];
    } | null>(),
    User.findOne(DEMO_ADMIN_FILTER).select('_id').lean<{
      _id: Types.ObjectId;
    } | null>(),
  ]);

  const failures: string[] = [];
  if (!customer) failures.push('account:demo-customer');
  if (!admin) failures.push('account:demo-admin');

  if (!customer) return { failures, accounts: null };
  return { failures, accounts: { customer, ownerIds: demoOwnerIds(customer, admin) } };
}

// ── Catalog ─────────────────────────────────────────────────────────────
// Slug is the natural key the restore upserts on, and the durable key product
// URLs are built from, so it is the right thing to assert. `isActive` is
// checked too: a deactivated cut is present in the collection and absent from
// the shop, which is the same failure from a visitor's side.
async function checkCatalog(): Promise<string[]> {
  const failures: string[] = [];

  const expectedSlugs = expectedProductSlugs();
  const liveProducts = await Product.find({ slug: { $in: expectedSlugs } })
    .select('slug isActive')
    .lean<{ slug: string; isActive: boolean }[]>();
  const activeSlugs = liveProducts.filter((p) => p.isActive).map((p) => p.slug);
  failures.push(...missing(expectedSlugs, activeSlugs).map((s) => `product:${s}`));

  const expectedCodes = expectedPromoCodes();
  const livePromos = await Promo.find({ code: { $in: expectedCodes } })
    .select('code')
    .lean<{ code: string }[]>();
  failures.push(
    ...missing(
      expectedCodes,
      livePromos.map((p) => p.code),
    ).map((c) => `promo:${c}`),
  );

  return failures;
}

// ── Roster and schedule ─────────────────────────────────────────────────
// The staff restore inserts then prunes by id. A partial failure between the
// two leaves an empty roster, which blanks the staff tab, the "On today" card
// and the shift drawer's picker all at once — the exact outage the ordering
// there was chosen to avoid, so it is worth confirming rather than assuming.
async function checkRosterAndSchedule(): Promise<string[]> {
  const failures: string[] = [];

  const expectedStaff = DEMO_STAFF.map((s) => s.name);
  const liveStaff = await StaffMember.find({ name: { $in: expectedStaff } })
    .select('name')
    .lean<{ name: string }[]>();
  failures.push(
    ...missing(
      expectedStaff,
      liveStaff.map((s) => s.name),
    ).map((n) => `staff:${n}`),
  );

  // Shifts are keyed on {weekStart, dayOfWeek, hourIndex}, and the week comes
  // from the snapshot's timezone rather than the live settings document — same
  // reasoning as the restore, which installs that snapshot moments earlier.
  const weekStart = currentWeekStartUtc(DEMO_SHOP_SETTINGS.timezone);
  const expectedSlots = DEMO_SHIFTS.map((s) => `${s.dayOfWeek}-${s.hourIndex}`);
  const liveShifts = await Shift.find({ weekStart })
    .select('dayOfWeek hourIndex')
    .lean<{ dayOfWeek: number; hourIndex: number }[]>();
  failures.push(
    ...missing(
      expectedSlots,
      liveShifts.map((s) => `${s.dayOfWeek}-${s.hourIndex}`),
    ).map((slot) => `shift:${slot}`),
  );

  return failures;
}

// ── Shop configuration ──────────────────────────────────────────────────
// Matched on the snapshot's own shop name, not merely "a settings document
// exists". An upsert that never ran leaves the previous document in place,
// which passes an existence check while the demo shows somebody else's shop.
async function checkSettings(): Promise<string[]> {
  const settings = await ShopSettings.findOne({}).select('shopName').lean<{
    shopName?: string;
  } | null>();

  if (!settings) return ['settings:missing'];
  if (settings.shopName !== DEMO_SHOP_SETTINGS.shopName) {
    return ['settings:not-restored'];
  }
  return [];
}

// ── Residue the wipe should have cleared ────────────────────────────────
// Reviews, messages and carts owned by either demo account are deleted and
// never re-seeded, so the correct state is none. A survivor here is a wipe that
// silently did not happen — and for reviews and messages that is publicly
// visible to the next visitor, which the privacy page promises against by name.
async function checkResidue(ownerIds: Types.ObjectId[]): Promise<string[]> {
  const [strayReviews, strayMessages, strayCarts] = await Promise.all([
    Review.countDocuments({ user: { $in: ownerIds } }),
    Message.countDocuments({ user: { $in: ownerIds } }),
    Cart.countDocuments({ user: { $in: ownerIds } }),
  ]);

  const failures: string[] = [];
  if (strayReviews > 0) failures.push('residue:reviews');
  if (strayMessages > 0) failures.push('residue:messages');
  if (strayCarts > 0) failures.push('residue:cart');
  return failures;
}

// ── Orphans ─────────────────────────────────────────────────────────────
// Both halves of the reset point at products by `_id`, and the restore's whole
// design is that those ids survive. If one did not, the damage is silent: a
// saved cut that renders nothing, an order line whose product lookup returns
// null. Resolve them rather than trusting the invariant.
async function checkOrphans({ customer, ownerIds }: DemoAccounts): Promise<string[]> {
  const failures: string[] = [];

  const savedCutIds = (customer.savedCuts ?? []).map(String);
  const demoOrders = await Order.find({ user: { $in: ownerIds } })
    .select('orderItems.product')
    .lean<{ orderItems?: { product?: Types.ObjectId | null }[] }[]>();

  const orderProductIds = demoOrders.flatMap((o) =>
    (o.orderItems ?? []).map((i) => (i.product ? String(i.product) : null)),
  );

  // A line with no product reference at all is already an orphan — nothing to
  // look up, and no id to name in the failure.
  if (orderProductIds.some((id) => id === null)) failures.push('orphan:order-line');

  const referenced = [
    ...new Set([
      ...savedCutIds,
      ...orderProductIds.filter((id): id is string => id !== null),
    ]),
  ];

  if (referenced.length > 0) {
    const resolved = await Product.find({ _id: { $in: referenced } })
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>();
    const live = new Set(resolved.map((p) => String(p._id)));

    if (savedCutIds.some((id) => !live.has(id))) failures.push('orphan:saved-cut');
    if (orderProductIds.some((id) => id !== null && !live.has(id))) {
      failures.push('orphan:order-line');
    }
  }

  return failures;
}

export async function verifyDemoState(): Promise<string[]> {
  await connectDB();

  const { failures: accountFailures, accounts } = await checkAccounts();
  if (!accounts) return accountFailures;

  const rest = await Promise.all([
    checkCatalog(),
    checkRosterAndSchedule(),
    checkSettings(),
    checkResidue(accounts.ownerIds),
    checkOrphans(accounts),
  ]);

  // Deduped because the orphan pass has two branches that can both name
  // `orphan:order-line` — a line with no reference at all, and one whose
  // reference does not resolve.
  return [...new Set([...accountFailures, ...rest.flat()])];
}
