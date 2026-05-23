import { z } from 'zod';

import { DORMANCY_THRESHOLD_VALUES } from '@/lib/shopSettings/constants';

// Single source of truth for shop settings PUT input. Consumed by:
//   - `src/app/api/settings/route.ts` (PUT) — admin save
//   - `src/components/admin/settings/SettingsClient.tsx` — pre-submit
//     check so admins see field-level errors without a round trip
//
// Both sites `safeParse` and surface the first issue. Field caps mirror the
// Mongoose schema's `min`/`max`/`enum` constraints so the database is
// defence-in-depth, not the only validator.

const SHOP_NAME_MAX = 80;
const TAGLINE_MAX = 120;
const DESCRIPTION_MAX = 400;
const PHONE_MAX = 30;
const EMAIL_MAX = 120;
const URL_MAX = 200;
const ADDRESS_MAX = 120;
const CITY_MAX = 80;
const ZIP_MAX = 12;
const TIMEZONE_MAX = 80;
const TIME_LABEL_MAX = 40;

const trimmedRequired = (label: string, max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(max, `${label} must be ${max} characters or fewer`),
    );

const trimmedOptional = (label: string, max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `${label} must be ${max} characters or fewer`));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const shopSettingsInputSchema = z
  .object({
    // General
    shopName: trimmedRequired('Shop name', SHOP_NAME_MAX),
    tagline: trimmedOptional('Tagline', TAGLINE_MAX),
    description: trimmedOptional('Description', DESCRIPTION_MAX),
    phone: trimmedOptional('Phone', PHONE_MAX),
    email: trimmedOptional('Email', EMAIL_MAX)
      .refine((s) => s.length === 0 || EMAIL_RE.test(s), { message: 'Email looks malformed' }),
    website: trimmedOptional('Website', URL_MAX),
    street: trimmedOptional('Street', ADDRESS_MAX),
    suite: trimmedOptional('Suite', ADDRESS_MAX),
    city: trimmedOptional('City', CITY_MAX),
    state: trimmedOptional('State', 4),
    zip: trimmedOptional('ZIP', ZIP_MAX),
    timezone: trimmedOptional('Timezone', TIMEZONE_MAX),
    opensAt: trimmedOptional('Opens at', TIME_LABEL_MAX),
    // Pickup
    slotsPerHour: z.number().int('Slots per hour must be a whole number').min(1, 'Slots per hour must be at least 1').max(60, 'Slots per hour must be 60 or fewer'),
    leadTime: trimmedOptional('Lead time', TIME_LABEL_MAX),
    maxBookingWindow: trimmedOptional('Max booking window', TIME_LABEL_MAX),
    // Notifications
    notifNewOrder: z.boolean(),
    notifLowStock: z.boolean(),
    notifNewEvent: z.boolean(),
    // Rewards
    pointsPerDollar: z.number().min(0, 'Points per dollar must be 0 or more'),
    weekendMultiplier: z.number().min(1, 'Weekend multiplier must be 1 or more').max(10, 'Weekend multiplier must be 10 or fewer'),
    pointsExpiryMonths: z.number().int().min(0, 'Points expiry must be 0 or more'),
    redemptionPoints: z.number().int().min(1, 'Redemption points must be 1 or more'),
    redemptionDollars: z.number().min(0, 'Redemption dollars must be 0 or more'),
    minToRedeem: z.number().int().min(0, 'Min to redeem must be 0 or more'),
    maxRedemptionPercent: z.number().int().min(1, 'Max redemption % must be 1 or more').max(100, 'Max redemption % must be 100 or fewer'),
    maxRedemptionDollars: z.number().min(0, 'Max redemption dollars must be 0 or more'),
    connoisseurThreshold: z.number().int().min(0, 'Connoisseur threshold must be 0 or more'),
    masterCutThreshold: z.number().int().min(0, 'Master Cut threshold must be 0 or more'),
    tierWindowMonths: z.number().int().min(0, 'Tier window must be 0 or more').max(120, 'Tier window must be 120 months or fewer'),
    // Privacy
    dormancyWarningMonths: z
      .number()
      .refine(
        (n) => (DORMANCY_THRESHOLD_VALUES as readonly number[]).includes(n),
        { message: 'Invalid dormancy threshold' },
      ),
  })
  .superRefine((obj, ctx) => {
    // Tier ordering — Master Cut sits above Connoisseur. Without this rule
    // a flipped pair saves and customer-side tier code reads silently broken.
    if (obj.masterCutThreshold <= obj.connoisseurThreshold) {
      ctx.addIssue({
        code: 'custom',
        message: 'Master Cut threshold must be higher than Connoisseur threshold',
        path: ['masterCutThreshold'],
      });
    }
  });

export type ShopSettingsInput = z.infer<typeof shopSettingsInputSchema>;

export function flattenIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
