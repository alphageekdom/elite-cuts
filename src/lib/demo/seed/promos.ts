import type { Promo } from '@/models/Promo';

// Seed shape: omit auto-managed fields (createdAt, updatedAt, usageCount,
// createdBy). The orchestrator stamps usageCount=0 at insert time so each
// nightly reset hands the demo a fresh, unredeemed code set.
export type DemoPromoSeed = Omit<
  Promo,
  'createdAt' | 'updatedAt' | 'usageCount' | 'createdBy'
>;

// Five sample promos covering percent + fixed, public chip + email-only,
// and one first-order-only — same mix as scripts/seed-promos.mjs.
//   - WELCOME10 / GRILL25 / FIRST5 / WEEKEND15 = public chips
//   - VIP30 = private (email-only)
// Fixed-value promos store `value` in cents; percent promos store whole
// numbers 1..100.
export const DEMO_PROMOS: DemoPromoSeed[] = [
  {
    code: 'WELCOME10',
    description: 'Welcome-back gift — appears as a public chip',
    type: 'percent',
    value: 10,
    perCustomerLimit: 1,
    firstOrderOnly: false,
    excludesPoints: true,
    excludesMember: false,
    isActive: true,
    isPublic: true,
  },
  {
    code: 'GRILL25',
    description: 'Summer grill season — 25% off with an $8 cap above $30',
    type: 'percent',
    value: 25,
    minSubtotal: 3000,
    maxDiscount: 800,
    perCustomerLimit: 1,
    firstOrderOnly: false,
    excludesPoints: true,
    excludesMember: false,
    isActive: true,
    isPublic: true,
  },
  {
    code: 'FIRST5',
    description: 'New-customer carrot — $5 off, first order only',
    type: 'fixed',
    value: 500,
    perCustomerLimit: 1,
    firstOrderOnly: true,
    excludesPoints: true,
    excludesMember: false,
    isActive: true,
    isPublic: true,
  },
  {
    code: 'WEEKEND15',
    description: '15% weekend boost — stacks with neither member nor points',
    type: 'percent',
    value: 15,
    usageLimit: 100,
    perCustomerLimit: 1,
    firstOrderOnly: false,
    excludesPoints: true,
    excludesMember: true,
    isActive: true,
    isPublic: true,
  },
  {
    code: 'VIP30',
    description: 'Private code for the email list — 30% off, never shown publicly',
    type: 'percent',
    value: 30,
    perCustomerLimit: 1,
    firstOrderOnly: false,
    excludesPoints: false,
    excludesMember: false,
    isActive: true,
    isPublic: false,
  },
];
