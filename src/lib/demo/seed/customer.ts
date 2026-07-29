// The rest of the demo customer's account state: saved cuts, addresses and
// saved cards.
//
// Same reasoning as the order history next door. A demo visitor lands on the
// account dashboard and every one of these sections is a section-shaped hole
// unless the reset puts something back — and two of them (saved cards,
// addresses) sit behind guards or flows a demo session can't complete, so the
// visitor can't populate them by hand either.

/**
 * Cuts on the saved list, by slug.
 *
 * Slugs for the same reason the order seed uses them: the nightly restore
 * upserts on a natural key, and `savedCuts` holds product ids, so anything
 * keyed on ids would need re-resolving anyway.
 *
 * Deliberately different from the cuts in the order history — Saved cuts and
 * "Buy it again" answer different questions ("what did I mean to come back
 * to" vs "what do I keep buying"), and seeding them with the same four cuts
 * would make the two sections look like duplicates of each other.
 */
export const DEMO_SAVED_CUT_SLUGS = [
  'tomahawk-steak',
  'rack-of-lamb',
  'pork-belly',
] as const;

export type DemoAddressSpec = {
  label: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
};

/**
 * Two addresses so the checkout's address picker has something to pick
 * *between* — with one entry the selector is a list of one and demonstrates
 * nothing.
 *
 * Both are in San Diego, which is where the shop says it is on the homepage
 * and the Our Story page. A demo delivery address three states away would
 * contradict the shop's own stated delivery radius.
 */
export const DEMO_ADDRESSES: DemoAddressSpec[] = [
  {
    label: 'Home',
    address1: '1412 Ivy Street',
    address2: 'Apt 3',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    isDefault: true,
  },
  {
    label: 'Work',
    address1: '830 Kettner Boulevard',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    isDefault: false,
  },
];

export type DemoCardSpec = {
  /** Globally unique in the schema. Namespaced so it can't collide with a real row. */
  stubCardId: string;
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  /** Years ahead of the reset run — never a literal, so the card can't age into "Expired". */
  expiresInYears: number;
};

// No real card number exists anywhere in this — these are the brand/last4
// display shells the saved-cards feature stores, which is all it ever stores.
export const DEMO_CARDS: DemoCardSpec[] = [
  {
    stubCardId: 'demo-seed-card-visa',
    cardholderName: 'Demo Customer',
    brand: 'visa',
    last4: '4242',
    expMonth: 11,
    expiresInYears: 3,
  },
  {
    stubCardId: 'demo-seed-card-mastercard',
    cardholderName: 'Demo Customer',
    brand: 'mastercard',
    last4: '5454',
    expMonth: 4,
    expiresInYears: 2,
  },
];
