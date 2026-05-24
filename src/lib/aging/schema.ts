import { z } from 'zod';

// Single source of truth for aging-cut POST/PATCH input. Consumed by:
//   - `src/app/api/aging/route.ts` (POST) — log a new cut into the aging room
//   - `src/app/api/aging/[id]/route.ts` (PATCH) — edit a cut in place
//
// No client-side submitter exists today (the inventory dashboard reads but
// does not author aging cuts), so the schema is only enforced server-side
// for now. If a drawer ships later, it should call `safeParse` pre-submit
// like the other admin domains do.

const CUT_MAX = 100;
const RACK_MAX = 60;
// Reasonable real-world ceiling. A dry-aged primal in a small-shop room is
// almost always under 30 lb; capping at 500 leaves headroom for an outlier
// whole hindquarter without letting a typo or tampered request stamp
// 1e10 into the aggregation totals downstream.
const WEIGHT_LB_MAX = 500;
// 6 months is a hard ceiling on commercial dry-aging in the room; even
// trophy programs rarely cross 120 days.
const TARGET_DAYS_MAX = 180;

const cutField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, 'cut name is required')
      .max(CUT_MAX, `cut must be ${CUT_MAX} characters or fewer`),
  );

const rackField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(RACK_MAX, `rack must be ${RACK_MAX} characters or fewer`),
  );

const targetDaysField = z
  .number({ message: 'targetDays must be a positive integer' })
  .int('targetDays must be a positive integer')
  .min(1, 'targetDays must be at least 1')
  .max(TARGET_DAYS_MAX, `targetDays must be ${TARGET_DAYS_MAX} or fewer`);

const weightLbField = z
  .number({ message: 'weightLb must be a non-negative number' })
  .finite('weightLb must be a non-negative number')
  .min(0, 'weightLb must be a non-negative number')
  .max(WEIGHT_LB_MAX, `weightLb must be ${WEIGHT_LB_MAX} or fewer`);

const startedAtField = z
  .string({ message: 'startedAt is required' })
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: 'startedAt is not a valid date',
  });

export const agingCreateSchema = z.object({
  cut: cutField,
  targetDays: targetDaysField.optional(),
  rack: rackField.optional(),
  weightLb: weightLbField.optional(),
  startedAt: startedAtField,
  isActive: z.boolean().optional(),
});

export type AgingCreateInput = z.infer<typeof agingCreateSchema>;

// PATCH branch — every field optional, at least one must be supplied.
export const agingPatchSchema = z
  .object({
    cut: cutField.optional(),
    targetDays: targetDaysField.optional(),
    rack: rackField.optional(),
    weightLb: weightLbField.optional(),
    startedAt: startedAtField.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'No editable fields supplied',
  });

export type AgingPatchInput = z.infer<typeof agingPatchSchema>;
