import { z } from 'zod';

import { SHIFT_COLORS } from '@/lib/shifts/constants';

// Single source of truth for shift POST/PATCH input. Consumed by:
//   - `src/app/api/shifts/route.ts` (POST) — create a shift
//   - `src/app/api/shifts/[id]/route.ts` (PATCH) — edit a shift in place
//   - `src/components/admin/schedule/ShiftFormDrawer.tsx` — pre-submit
//     check so admins see field-level errors without a round trip.
//
// All three sites `safeParse` and surface the first issue. Field caps mirror
// the drawer's `maxLength` props so the server matches what the UI allows.

const STAFF_NAME_MAX = 60;
const ROLE_MAX = 40;

// Trim first, then enforce caps on the trimmed value so leading/trailing
// whitespace doesn't count against the limit.
const staffNameField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(1, 'staffName is required')
      .max(STAFF_NAME_MAX, `staffName must be ${STAFF_NAME_MAX} characters or fewer`),
  );

const roleField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(ROLE_MAX, `role must be ${ROLE_MAX} characters or fewer`),
  );

const dayOfWeekField = z
  .number({ message: 'dayOfWeek must be an integer 0–6' })
  .int('dayOfWeek must be an integer 0–6')
  .min(0, 'dayOfWeek must be an integer 0–6')
  .max(6, 'dayOfWeek must be an integer 0–6');

const hourIndexField = z
  .number({ message: 'hourIndex must be an integer 0–8' })
  .int('hourIndex must be an integer 0–8')
  .min(0, 'hourIndex must be an integer 0–8')
  .max(8, 'hourIndex must be an integer 0–8');

const colorField = z.enum(SHIFT_COLORS, {
  message: 'color is not a recognized value',
});

export const shiftCreateSchema = z.object({
  weekStart: z
    .string({ message: 'weekStart is required' })
    .refine(
      (s) => !Number.isNaN(new Date(s).getTime()),
      { message: 'weekStart is not a valid date' },
    ),
  dayOfWeek: dayOfWeekField,
  hourIndex: hourIndexField,
  staffName: staffNameField,
  role: roleField.optional(),
  color: colorField.optional(),
});

export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;

// PATCH branch — every field optional, but at least one must be supplied.
export const shiftPatchSchema = z
  .object({
    staffName: staffNameField.optional(),
    role: roleField.optional(),
    color: colorField.optional(),
    dayOfWeek: dayOfWeekField.optional(),
    hourIndex: hourIndexField.optional(),
  })
  .refine(
    (obj) => Object.values(obj).some((v) => v !== undefined),
    { message: 'No editable fields supplied' },
  );

export type ShiftPatchInput = z.infer<typeof shiftPatchSchema>;
