import { describe, it, expect } from 'vitest';

import {
  buildLoginBenefits,
  buildRegisterBenefits,
  type AuthBenefitSettings,
} from './auth-benefits';

const base: AuthBenefitSettings = {
  pointsPerDollar: 1,
  weekendMultiplier: 1,
  redemptionPoints: 100,
  redemptionDollars: 5,
  masterCutThreshold: 1000,
  leadTime: '30 min',
};

const bodyOf = (settings: AuthBenefitSettings, num: string) =>
  buildLoginBenefits(settings).find((b) => b.num === num)!.body;

const titleOf = (settings: AuthBenefitSettings, num: string) =>
  buildLoginBenefits(settings).find((b) => b.num === num)!.title;

describe('buildLoginBenefits', () => {
  it('returns the four numbered benefits in order', () => {
    expect(buildLoginBenefits(base).map((b) => b.num)).toEqual([
      '01',
      '02',
      '03',
      '04',
    ]);
  });
});

describe('the weekend multiplier claim', () => {
  // The design's copy said "double on weekends" unconditionally. The setting
  // defaults to 1, so on a default shop that sentence is simply false — the
  // same claim that had to be stripped off the customer profile page.
  it('is absent when the shop runs no weekend bonus', () => {
    expect(bodyOf(base, '03')).not.toMatch(/weekend/i);
  });

  it('appears only when the multiplier is actually above 1', () => {
    expect(bodyOf({ ...base, weekendMultiplier: 2 }, '03')).toContain(
      '2× on weekends',
    );
  });

  it('states the configured multiplier rather than assuming double', () => {
    const body = bodyOf({ ...base, weekendMultiplier: 3 }, '03');
    expect(body).toContain('3× on weekends');
    expect(body).not.toContain('2×');
  });
});

describe('the points rate', () => {
  it('reads the configured rate, singular at 1', () => {
    expect(bodyOf(base, '03')).toContain('1 point per dollar');
  });

  it('pluralises above 1', () => {
    expect(bodyOf({ ...base, pointsPerDollar: 3 }, '03')).toContain(
      '3 points per dollar',
    );
  });

  it('quotes the configured redemption rate, not a hardcoded one', () => {
    expect(
      bodyOf({ ...base, redemptionPoints: 250, redemptionDollars: 10 }, '03'),
    ).toContain('250 pts = $10 off');
  });
});

describe('the pickup lead time', () => {
  // The design promised "about an hour" against a configured 30 minutes.
  it('reads the configured lead time', () => {
    expect(titleOf(base, '02')).toBe('Pickup about 30 min');
  });

  it('follows the shop when the lead time changes', () => {
    expect(titleOf({ ...base, leadTime: '2 hours' }, '02')).toBe(
      'Pickup about 2 hours',
    );
  });

  // Shares the product page's fallback rather than printing a broken string.
  it('degrades to a vague phrase when the lead time is unparseable', () => {
    expect(titleOf({ ...base, leadTime: 'whenever' }, '02')).toBe(
      'Pickup shortly',
    );
  });
});

describe('the allocations benefit', () => {
  // First dibs on Wagyu is a Master Cut tier perk, not something membership
  // alone buys. The copy has to name the tier and its cost.
  it('names the tier and quotes the configured threshold', () => {
    const body = bodyOf(base, '04');
    expect(body).toContain('Master Cut');
    expect(body).toContain('1,000 points');
  });

  it('follows the configured threshold', () => {
    expect(bodyOf({ ...base, masterCutThreshold: 2500 }, '04')).toContain(
      '2,500 points',
    );
  });
});

describe('buildRegisterBenefits', () => {
  const bodies = (s: AuthBenefitSettings) =>
    buildRegisterBenefits(s).map((b) => b.body).join(' ');
  const titles = (s: AuthBenefitSettings) =>
    buildRegisterBenefits(s).map((b) => b.title).join(' ');

  it('returns four numbered benefits in order', () => {
    expect(buildRegisterBenefits(base).map((b) => b.num)).toEqual([
      '01',
      '02',
      '03',
      '04',
    ]);
  });

  // The design's headline. Registration awards nothing, so no wording on this
  // panel may imply a balance arrives with the account.
  it('never promises points for signing up', () => {
    const all = `${titles(base)} ${bodies(base)}`.toLowerCase();
    expect(all).not.toContain('on the house');
    expect(all).not.toMatch(/start with \d/);
    expect(all).not.toMatch(/free points|bonus points|welcome points/);
  });

  // Both of these shipped on the live register page and are false: early
  // access is a tier perk, and the prep notes are on every public product
  // page where a guest can already read them.
  it('drops the tier-gated and guest-available claims', () => {
    const all = `${titles(base)} ${bodies(base)}`.toLowerCase();
    expect(all).not.toContain('early access');
    expect(all).not.toContain('dry-aged');
    expect(all).not.toContain('cooking');
    expect(all).not.toContain('recipes');
  });

  // Same guard as the sign-in panel, reached through the shared helper so the
  // two can't drift.
  it('claims a weekend bonus only when one is configured', () => {
    expect(bodies(base)).not.toMatch(/weekend/i);
    expect(bodies({ ...base, weekendMultiplier: 2 })).toContain(
      '2× on weekends',
    );
  });

  it('reads the configured points and redemption rates', () => {
    const body = bodies({
      ...base,
      pointsPerDollar: 2,
      redemptionPoints: 250,
      redemptionDollars: 10,
    });
    expect(body).toContain('2 points per dollar');
    expect(body).toContain('250 pts = $10 off');
  });

  it('reads the configured pickup lead time', () => {
    expect(titles(base)).toContain('ready about 30 min');
    expect(titles({ ...base, leadTime: '2 hours' })).toContain(
      'ready about 2 hours',
    );
  });

  // The order-history benefit promised a collection date and a receipt to pull
  // up later. Neither is reachable: a profile order row prints the placed date,
  // and /receipt/[id] is only ever opened by the admin print button.
  it('promises no receipt and no collection date', () => {
    const all = `${titles(base)} ${bodies(base)}`.toLowerCase();
    expect(all).not.toContain('receipt');
    expect(all).not.toMatch(/collected|when you picked/);
  });

  // Registering redirects to /login, so a new customer reads both panels within
  // seconds of each other. The points line is identical on purpose — it comes
  // from the shared helper — but nothing else may be.
  it('shares no wording with the sign-in panel beyond the points line', () => {
    const loginBenefits = buildLoginBenefits(base);
    const registerBenefits = buildRegisterBenefits(base);

    const sharedBodies = registerBenefits
      .map((b) => b.body)
      .filter((body) => loginBenefits.some((l) => l.body === body));
    expect(sharedBodies).toHaveLength(1);
    expect(sharedBodies[0]).toContain('per dollar');

    const sharedTitles = registerBenefits
      .map((b) => b.title)
      .filter((title) => loginBenefits.some((l) => l.title === title));
    expect(sharedTitles).toEqual([]);
  });
});
