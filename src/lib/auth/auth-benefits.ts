import type { ShopSettings } from '@/models/ShopSettings';
import { formatRedemptionRate } from '@/lib/rewards/calculator';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';

// The numbered benefits on the two auth panels — sign-in and register.
//
// Derived rather than written down, because the designs they came from kept
// getting them wrong: both promised double points on weekends (the multiplier
// defaults to 1, so the bonus usually doesn't exist), sign-in promised pickup
// "in about an hour" (the configured lead time is 30 min), and register
// promised "100 points on the house" (registration awards nothing at all).
// These are the shop's own settings, so the only way the copy can't drift from
// the shop is to read them.
export type AuthBenefit = {
  num: string;
  title: string;
  body: string;
};

export type AuthBenefitSettings = Pick<
  ShopSettings,
  | 'pointsPerDollar'
  | 'weekendMultiplier'
  | 'redemptionPoints'
  | 'redemptionDollars'
  | 'masterCutThreshold'
  | 'leadTime'
>;

// Shared by both panels so the weekend-multiplier guard can only be written
// once. Two copies of this sentence is exactly how the "2× on weekends" claim
// survived on the profile page long after the setting stopped backing it.
function pointsBody(settings: AuthBenefitSettings): string {
  const ppd = settings.pointsPerDollar;
  const rate = ppd === 1 ? '1 point' : `${ppd} points`;
  const weekend =
    settings.weekendMultiplier > 1
      ? `, ${settings.weekendMultiplier}× on weekends`
      : '';
  return `${rate} per dollar${weekend} — ${formatRedemptionRate(settings)}.`;
}

export function buildLoginBenefits(
  settings: AuthBenefitSettings,
): AuthBenefit[] {
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
      body: pointsBody(settings),
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

// The register panel answers a different question — not "what do you already
// have" but "what does joining get you" — so it can't just reuse the sign-in
// list. Every line here is a flow that works for any registered customer today.
//
// Deliberately absent: the design's "start with 100 points on the house".
// Registration awards nothing, and inventing a signup bonus in copy is how the
// profile page ended up claiming a weekend multiplier the shop wasn't running.
// Also absent: "early access to dry-aged drops" and "cooking notes from the
// butcher", both of which shipped on this page and are false — early access is
// a tier perk, and the prep notes are on every public product page where a
// guest can already read them.
export function buildRegisterBenefits(
  settings: AuthBenefitSettings,
): AuthBenefit[] {
  return [
    // 01 and 02 cover the same two features as the sign-in panel's 02 and 01,
    // so they're worded to survive being read side by side: registering
    // redirects to /login, which means every new customer meets both panels
    // within a few seconds of each other. Keep them phrased apart.
    {
      num: '01',
      title: `Order ahead, ready ${formatReadyIn(settings.leadTime)}`,
      body: "Reserve your cuts online, choose a pickup slot at checkout, and they're waiting when you arrive.",
    },
    {
      num: '02',
      title: 'Your regulars, saved',
      body: 'Build a list of the cuts you buy most and reorder them in a couple of taps.',
    },
    {
      num: '03',
      title: 'Points from your first order',
      body: pointsBody(settings),
    },
    {
      // Scoped to what a profile order row renders: the total, the payment
      // method, and a status chip. It promised two things it can't deliver —
      // a collection date (`readyAt`/`completedAt` are on the model but never
      // reach the customer's row, which shows the placed date) and a receipt
      // to pull up later (`/receipt/[id]` is only ever opened by the admin
      // print button; the customer's row links nowhere). Don't promise either
      // back without wiring the surface first.
      num: '04',
      title: 'Every order, kept',
      body: 'Your orders stay on your profile — what you paid, and where each one stands.',
    },
  ];
}
