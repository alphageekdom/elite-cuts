import { z } from 'zod';

import { MESSAGE_STATUSES } from '@/lib/messages/constants';

// ObjectId hex pattern — 24 hex chars. Avoids pulling mongoose into the
// client bundle when this schema is imported from NewMessageModal.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

// Single source of truth for the messages input shape. Consumed by:
//   - `src/app/api/messages/route.ts` (POST) — admin / customer message create
//   - `src/app/api/messages/[id]/route.ts` (PATCH) — owner subject/body edit
//   - `src/components/profile/NewMessageModal.tsx` — pre-submit client-side
//     check so customers see field-level errors without a round trip.
//
// Both sides parse with `messageInputSchema.safeParse(...)` and surface the
// first issue. The 120 / 2000 length caps mirror the mongoose schema.

const SUBJECT_MAX = 120;
const BODY_MAX = 2000;
const ORDER_REF_MAX = 100;

// Trim first, then enforce the length on the trimmed value (so leading or
// trailing whitespace doesn't count against the cap).
function trimmedRequired(label: string, max: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(max, `${label} must be ${max} characters or fewer`),
    );
}

function trimmedOptional(label: string, max: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .max(max, `${label} must be ${max} characters or fewer`)
        .transform((s) => (s.length === 0 ? undefined : s)),
    )
    .optional();
}

// ObjectId-shaped string. Empty / undefined → undefined; invalid string fails.
const orderIdField = z
  .string()
  .optional()
  .transform((s) => (s && s.length > 0 ? s : undefined))
  .refine(
    (s) => s === undefined || OBJECT_ID_RE.test(s),
    { message: 'Invalid orderId' },
  );

export const messageInputSchema = z.object({
  subject: trimmedRequired('Subject', SUBJECT_MAX),
  body: trimmedRequired('Message body', BODY_MAX),
  orderId: orderIdField,
  orderRef: trimmedOptional('orderRef', ORDER_REF_MAX),
});

export type MessageInput = z.infer<typeof messageInputSchema>;

// PATCH /api/messages/[id] status-update branch. Admin-only — the route
// gates on `isAdmin && typeof body.status === 'string'`.
export const messageStatusUpdateSchema = z.object({
  status: z.enum(MESSAGE_STATUSES, { message: 'Invalid status' }),
});

export type MessageStatusUpdate = z.infer<typeof messageStatusUpdateSchema>;

// Owner-edit branch — subject + body only (status stays admin-only).
export const messageOwnerEditSchema = messageInputSchema.pick({
  subject: true,
  body: true,
});

export type MessageOwnerEdit = z.infer<typeof messageOwnerEditSchema>;

