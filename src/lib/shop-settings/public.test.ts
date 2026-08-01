import { describe, expect, it } from 'vitest';

import { DEFAULT_SHOP_SETTINGS, SHOP_SETTINGS_KEYS } from './defaults';
import {
  ADMIN_ONLY_SHOP_SETTINGS_KEYS,
  PUBLIC_SHOP_SETTINGS_KEYS,
  toPublicShopSettings,
} from './public';

describe('shop settings public slice', () => {
  // The one that matters. Adding a field to the model without deciding whether
  // customers may see it fails here, naming the field — which is the whole
  // reason the strip was inverted from a denylist to an allowlist.
  it('classifies every key on the model as either public or admin-only', () => {
    const classified = new Set<string>([
      ...PUBLIC_SHOP_SETTINGS_KEYS,
      ...ADMIN_ONLY_SHOP_SETTINGS_KEYS,
    ]);
    const unclassified = SHOP_SETTINGS_KEYS.filter((k) => !classified.has(k));

    expect(
      unclassified,
      `Unclassified shop setting(s): ${unclassified.join(', ')}. Add each to ` +
        'PUBLIC_SHOP_SETTINGS_KEYS or ADMIN_ONLY_SHOP_SETTINGS_KEYS in public.ts.',
    ).toEqual([]);
  });

  it('never lists the same key as both public and admin-only', () => {
    const admin = new Set<string>(ADMIN_ONLY_SHOP_SETTINGS_KEYS);
    expect(PUBLIC_SHOP_SETTINGS_KEYS.filter((k) => admin.has(k))).toEqual([]);
  });

  it('pins the exact public key set', () => {
    // Deliberately spelled out: a diff here should be a decision someone made,
    // not something that rode along with an unrelated change.
    expect([...PUBLIC_SHOP_SETTINGS_KEYS].sort()).toEqual(
      [
        'city',
        'connoisseurThreshold',
        'description',
        'email',
        'leadTime',
        'masterCutThreshold',
        'maxBookingWindow',
        'maxRedemptionDollars',
        'maxRedemptionPercent',
        'minToRedeem',
        'phone',
        'pointsExpiryMonths',
        'pointsPerDollar',
        'redemptionDollars',
        'redemptionPoints',
        'shopName',
        'slotsPerHour',
        'state',
        'street',
        'suite',
        'tierWindowMonths',
        'timezone',
        'website',
        'weekendMultiplier',
        'zip',
      ].sort(),
    );
  });

  it('emits only public keys, whatever the input carries', () => {
    const publicSlice = toPublicShopSettings(DEFAULT_SHOP_SETTINGS);
    expect(Object.keys(publicSlice).sort()).toEqual(
      [...PUBLIC_SHOP_SETTINGS_KEYS].sort(),
    );
  });

  it('drops the admin-only alert preferences and dormancy threshold', () => {
    const publicSlice = toPublicShopSettings(DEFAULT_SHOP_SETTINGS) as Record<
      string,
      unknown
    >;
    for (const key of ADMIN_ONLY_SHOP_SETTINGS_KEYS) {
      expect(publicSlice[key]).toBeUndefined();
    }
  });

  it('ignores unknown keys rather than passing them through', () => {
    // A stray field on the document — a legacy column, or one added to Mongo
    // outside the schema — must not reach the browser just because nobody
    // thought to deny it. This is the behaviour the denylist could not give.
    const withExtra = {
      ...DEFAULT_SHOP_SETTINGS,
      internalMarginPercent: 42,
      cronSecret: 'nope',
    } as unknown as typeof DEFAULT_SHOP_SETTINGS;

    const publicSlice = toPublicShopSettings(withExtra) as Record<string, unknown>;
    expect(publicSlice.internalMarginPercent).toBeUndefined();
    expect(publicSlice.cronSecret).toBeUndefined();
  });

  it('carries the public values through unchanged', () => {
    const publicSlice = toPublicShopSettings(DEFAULT_SHOP_SETTINGS);
    expect(publicSlice.shopName).toBe(DEFAULT_SHOP_SETTINGS.shopName);
    expect(publicSlice.pointsPerDollar).toBe(DEFAULT_SHOP_SETTINGS.pointsPerDollar);
    expect(publicSlice.timezone).toBe(DEFAULT_SHOP_SETTINGS.timezone);
  });
});
