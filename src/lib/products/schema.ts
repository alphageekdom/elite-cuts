import { z } from 'zod';

import { PRODUCT_CATEGORIES } from '@/lib/admin/constants';
import { MEAT_QUALITY_TIERS, PRICING_TYPES } from '@/lib/products/constants';

// Single source of truth for the admin product form + CSV import input
// shape. Consumed by:
//   - `src/app/api/products/route.ts` (POST) — admin create
//   - `src/app/api/products/[id]/route.ts` (PUT) — admin edit
//   - `src/app/api/products/import/route.ts` — CSV import
//   - `src/components/admin/products/ProductFormDrawer.tsx` — pre-submit
//     client-side check so admins see field-level errors without a round
//     trip.
//
// FormData / CSV string inputs need a coercion pass before this schema —
// see `./parse-form-input.ts`. Once parsed, both surfaces run
// `productInputSchema.safeParse(typed)` and surface the first issue.

// String fields — trim, normalize empty strings to undefined for optional
// slots, cap length.
const requiredText = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(max, `${label} must be ${max} characters or fewer`),
    );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .max(max, `${label} must be ${max} characters or fewer`)
        .transform((s) => (s.length === 0 ? undefined : s)),
    )
    .optional();

const positiveNumberOptional = (label: string) =>
  z.number().positive(`${label} must be greater than zero`).optional();

const nonNegativeInt = (label: string) =>
  z
    .number({ message: `${label} is required` })
    .int(`${label} must be a whole number`)
    .nonnegative(`${label} must be zero or greater`);

export const productInputSchema = z
  .object({
    // — Identity
    name: requiredText(200, 'Name'),
    slug: optionalText(200, 'Slug'),
    description: requiredText(2000, 'Description'),
    category: z.enum(PRODUCT_CATEGORIES, { message: 'Category is required' }),
    cutType: requiredText(100, 'Cut type'),
    qualityTier: z.enum(MEAT_QUALITY_TIERS).default('standard'),

    // — Pricing discriminator + per-type fields (all optional at the type
    // level; superRefine below enforces which are required for each
    // pricingType).
    pricingType: z.enum(PRICING_TYPES, { message: 'Pricing type is required' }),
    packagePrice: positiveNumberOptional('Package price'),
    packageWeightLb: positiveNumberOptional('Package weight'),
    pricePerLb: positiveNumberOptional('Price per pound'),
    estimatedWeightLb: positiveNumberOptional('Estimated weight'),
    averageWeightLb: positiveNumberOptional('Average weight'),
    minWeightLb: positiveNumberOptional('Minimum weight'),
    maxWeightLb: positiveNumberOptional('Maximum weight'),
    unitPrice: positiveNumberOptional('Unit price'),
    bundlePrice: positiveNumberOptional('Bundle price'),
    includedItems: z.array(z.string().trim().min(1)).optional(),

    // — Inventory + back-of-house
    stock: nonNegativeInt('Stock'),
    sku: optionalText(200, 'SKU'),
    gradeBreed: optionalText(200, 'Grade / breed'),
    supplier: optionalText(200, 'Supplier'),
    parLevel: nonNegativeInt('Par level').optional(),
    reorderPoint: nonNegativeInt('Reorder point').optional(),

    // — Flags
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    isAged: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const need = (key: keyof typeof data, label: string) => {
      if (data[key] === undefined || data[key] === null) {
        ctx.addIssue({
          code: 'custom',
          path: [key as string],
          message: `${label} is required for ${data.pricingType.replace(/_/g, ' ')} pricing`,
        });
      }
    };

    switch (data.pricingType) {
      case 'fixed_package':
        need('packagePrice', 'Package price');
        need('packageWeightLb', 'Package weight');
        break;
      case 'per_lb':
        need('pricePerLb', 'Price per pound');
        need('estimatedWeightLb', 'Estimated weight');
        need('minWeightLb', 'Minimum weight');
        need('maxWeightLb', 'Maximum weight');
        break;
      case 'whole_item_by_weight':
        need('pricePerLb', 'Price per pound');
        need('averageWeightLb', 'Average weight');
        need('minWeightLb', 'Minimum weight');
        need('maxWeightLb', 'Maximum weight');
        break;
      case 'each':
        need('unitPrice', 'Unit price');
        break;
      case 'bundle':
        need('bundlePrice', 'Bundle price');
        if (!data.includedItems?.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['includedItems'],
            message: 'Bundles must list at least one included item',
          });
        }
        break;
    }

    // Min-max sanity for variable-weight cuts.
    if (
      typeof data.minWeightLb === 'number' &&
      typeof data.maxWeightLb === 'number' &&
      data.maxWeightLb < data.minWeightLb
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxWeightLb'],
        message: 'Maximum weight must be greater than or equal to minimum weight',
      });
    }
  });

export type ProductInput = z.infer<typeof productInputSchema>;

// Flatten zod issues into a `{ field: firstMessage }` map for inline form
// error display. Matches the promos convention — issues for a path collapse
// to the first message.
export function flattenProductIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '_');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
