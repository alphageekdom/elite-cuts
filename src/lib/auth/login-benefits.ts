import type { ShopSettings } from '@/models/ShopSettings';
import { formatRedemptionRate } from '@/lib/rewards/calculator';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';

// The four numbered member benefits on the sign-in panel.
//
// Derived rather than written down, because the design they came from got two
// of them wrong: it promised double points on weekends (the multiplier defaults
// to 1, so the bonus usually doesn't exist) and pickup "in about an hour" (the
// configured lead time is 30 min). Both are the shop's own settings, so the
// only way the copy can't drift from the shop is to read them.
export type LoginBenefit = {
  num: string;
  title: string;
  body: string;
};

export type LoginBenefitSettings = Pick<
  ShopSettings,
  | 'pointsPerDollar'
  | 'weekendMultiplier'
  | 'redemptionPoints'
  | 'redemptionDollars'
  | 'masterCutThreshold'
  | 'leadTime'
>;

export function buildLoginBenefits(
  settings: LoginBenefitSettings,
): LoginBenefit[] {
  const ppd = settings.pointsPerDollar;
  const pointsPerDollar = ppd === 1 ? '1 point' : `${ppd} points`;

  // Only claimed when the shop actually runs one. The same guard the rewards
  // tier list uses — a hardcoded "2× on weekends" is exactly the bug that had
  // to be stripped off the profile page, and the multiplier defaults to 1.
  const weekend =
    settings.weekendMultiplier > 1
      ? `, ${settings.weekendMultiplier}× on weekends`
      : '';

  return [
    {
      num: '01',
      title: 'Your cuts, remembered',
      body: 'Save the cuts you buy most and reorder them without hunting through the case again.',
    },
    {
      num: '02',
      title: `Pickup ${formatReadyIn(settings.leadTime)}`,
      body: 'Order ahead, pick a slot at checkout, and skip the queue at the counter.',
    },
    {
      num: '03',
      title: 'Points on every order',
      body: `${pointsPerDollar} per dollar${weekend} — ${formatRedemptionRate(settings)}.`,
    },
    {
      // The design billed allocations as a plain membership perk. They aren't:
      // first dibs on Wagyu sits in the Master Cut tier list, so the copy has
      // to name the tier and what reaching it takes.
      num: '04',
      title: 'First dibs, once you earn it',
      body: `Reach Master Cut at ${settings.masterCutThreshold.toLocaleString('en-US')} points for first pick of Wagyu allocations and 15% off dry-aged.`,
    },
  ];
}
