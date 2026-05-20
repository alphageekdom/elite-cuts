import { z } from 'zod';

import { PROMO_TYPES } from '@/lib/promos/constants';

// Single source of truth for the admin promo form input shape. Consumed by:
//   - `src/actions/promos.ts` (createPromo, updatePromo) — server-side
//     authoritative check before mongoose accepts the doc.
//   - `src/components/admin/promos/PromoFormDrawer.tsx` — pre-submit
//     client-side check so admins see field-level errors without a
//     round trip.
//
// Both sides parse with `promoInputSchema.safeParse(...)` and surface the
// first issue. The shape inferred via `z.infer<typeof promoInputSchema>`
// is what `Promo.create()` expects.

const CODE_RE = /^[A-Z0-9_-]{3,30}$/;

// description: trim, undefined if empty after trim, cap at 280 of the
// trimmed value. Trimming before .max() matches the old validator's
// behavior — leading or trailing whitespace doesn't count against the cap.
const descriptionField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(280, 'Description must be 280 characters or fewer')
      .transform((s) => (s.length === 0 ? undefined : s)),
  )
  .optional();

// Non-negative integer cents — used by minSubtotal, maxDiscount. The form
// sends `null` when the field is empty; the schema accepts `null` through
// and lets the server $unset that key on update.
const nonNegativeCents = z
  .number()
  .int('Must be a whole number of cents')
  .nonnegative('Must be zero or greater')
  .nullable();

// Positive integer — used by usageLimit, where 0 doesn't make sense.
const positiveIntNullable = z
  .number()
  .int('Must be a whole number')
  .positive('Must be greater than zero')
  .nullable();

// ISO date-time string from the form (built via Date.toISOString()) → Date.
// Accepts null when the field is empty.
const isoDateField = z
  .string()
  .datetime({ message: 'Invalid date' })
  .transform((s) => new Date(s))
  .nullable();

export const promoInputSchema = z
  .object({
    code: z
      .string()
      .transform((s) => s.trim().toUpperCase())
      .pipe(
        z
          .string()
          .regex(
            CODE_RE,
            'Code must be 3-30 characters: letters, numbers, dash, underscore',
          ),
      ),
    description: descriptionField,
    type: z.enum(PROMO_TYPES, { message: 'Type must be "percent" or "fixed"' }),
    value: z
      .number({ message: 'Value is required' })
      .positive('Value must be greater than zero'),
    minSubtotal: nonNegativeCents.default(null),
    maxDiscount: nonNegativeCents.default(null),
    startsAt: isoDateField.default(null),
    endsAt: isoDateField.default(null),
    usageLimit: positiveIntNullable.default(null),
    perCustomerLimit: z
      .number()
      .int('Per-customer limit must be a whole number')
      .positive('Per-customer limit must be greater than zero')
      .default(1),
    firstOrderOnly: z.boolean().default(false),
    excludesPoints: z.boolean().default(true),
    excludesMember: z.boolean().default(false),
    isActive: z.boolean().default(true),
    isPublic: z.boolean().default(false),
  })
  // Type-dependent value rules — percent must be an integer 1-100, fixed
  // must be a positive integer (already-positive from the field's own check;
  // this is the integer-only refinement).
  .superRefine((data, ctx) => {
    if (data.type === 'percent') {
      if (!Number.isInteger(data.value) || data.value < 1 || data.value > 100) {
        ctx.addIssue({
          code: 'custom',
          path: ['value'],
          message: 'Percent value must be a whole number between 1 and 100',
        });
      }
    }
    if (data.type === 'fixed' && !Number.isInteger(data.value)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Fixed value must be a whole number of cents',
      });
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'End date must be after the start date',
      });
    }
  });

export type PromoInput = z.infer<typeof promoInputSchema>;

// Flatten zod issues into a `{ field: firstMessage }` map for inline form
// error display. Matches the convention used elsewhere (issues for a path
// collapse to the first message — admins don't need multiple errors on the
// same field at once).
export function flattenPromoIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
