import { describe, it, expect } from 'vitest';

import {
  buildLoginBenefits,
  type LoginBenefitSettings,
} from './login-benefits';

const base: LoginBenefitSettings = {
  pointsPerDollar: 1,
  weekendMultiplier: 1,
  redemptionPoints: 100,
  redemptionDollars: 5,
  masterCutThreshold: 1000,
  leadTime: '30 min',
};

const bodyOf = (settings: LoginBenefitSettings, num: string) =>
  buildLoginBenefits(settings).find((b) => b.num === num)!.body;

const titleOf = (settings: LoginBenefitSettings, num: string) =>
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
