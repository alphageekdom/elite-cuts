import { z } from 'zod';

import { SHIFT_COLORS } from '@/lib/shift-constants';
import { STAFF_ROLE_KEYS, STAFF_STATUSES } from '@/lib/staff-display';

// Single source of truth for staff POST/PATCH input. Consumed by:
//   - `src/app/api/staff/route.ts` (POST) — create staff
//   - `src/app/api/staff/[id]/route.ts` (PATCH) — edit staff
//   - `src/components/admin/staff/StaffFormDrawer.tsx` — pre-submit check
//     so admins see field-level errors without a round trip.
//
// All three sites `safeParse` and surface the first issue. Field caps
// mirror the drawer's `maxLength` props.

const NAME_MAX = 80;
const ROLE_MAX = 40;
const STATION_MAX = 60;
const EMAIL_MAX = 120;
const NOTES_MAX = 500;

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

// Light email shape check — `@` + `.` in the domain. Optional because staff
// records can lack an email. Exported so the drawer's inline UX-only check
// reads from the same regex this schema enforces.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z
      .string()
      .max(EMAIL_MAX, `Email must be ${EMAIL_MAX} characters or fewer`)
      .refine(
        (s) => s.length === 0 || EMAIL_RE.test(s),
        { message: 'Email looks malformed' },
      ),
  );

const roleKeyField = z.enum(STAFF_ROLE_KEYS, { message: 'Invalid role' });
const statusField = z.enum(STAFF_STATUSES, { message: 'Invalid status' });
const colorField = z.enum(SHIFT_COLORS, { message: 'Invalid color' });

// Create branch — name required; the rest fall to safe defaults if omitted.
export const staffCreateSchema = z.object({
  name: trimmedRequired('Name', NAME_MAX),
  role: trimmedOptional('Role', ROLE_MAX).optional(),
  roleKey: roleKeyField.optional(),
  station: trimmedOptional('Station', STATION_MAX).optional(),
  color: colorField.optional(),
  status: statusField.optional(),
  email: emailField.optional(),
  notes: trimmedOptional('Notes', NOTES_MAX).optional(),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

// Patch branch — every field optional, but at least one must be supplied.
export const staffPatchSchema = z
  .object({
    name: trimmedRequired('Name', NAME_MAX).optional(),
    role: trimmedOptional('Role', ROLE_MAX).optional(),
    roleKey: roleKeyField.optional(),
    station: trimmedOptional('Station', STATION_MAX).optional(),
    color: colorField.optional(),
    status: statusField.optional(),
    email: emailField.optional(),
    notes: trimmedOptional('Notes', NOTES_MAX).optional(),
  })
  .refine(
    (obj) => Object.values(obj).some((v) => v !== undefined),
    { message: 'No editable fields supplied' },
  );

export type StaffPatchInput = z.infer<typeof staffPatchSchema>;
