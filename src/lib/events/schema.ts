import { z } from 'zod';

import {
  EVENT_MAX_END_HOUR,
  EVENT_MESSAGE_MAX,
  EVENT_MIN_START_HOUR,
  EVENT_STATUSES,
  validateEventInput,
} from '@/lib/events/config';

// Single source of truth for grill-event POST/PATCH body shape. Consumed by:
//   - `src/app/api/events/route.ts` (POST) — schedule a new grill event
//   - `src/app/api/events/[id]/route.ts` (PATCH) — edit, cancel, or
//     reschedule an existing event
//
// Cross-field rules (summer window, weekend-only, duration, past-date check)
// are delegated to `validateEventInput` in `@/lib/event-config` so the
// client-side `GrillEventFormDrawer` — which already calls that validator
// directly to surface inline errors — and the server routes can't drift on
// the rule set. Zod owns the shape contract here; the cross-field helper
// owns the semantic rules.

const CANCELLATION_REASON_MAX = 120;

const dateField = z.string({ message: 'Pick a valid date.' });

const hourField = z
  .number({ message: `Hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.` })
  .int(`Hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.`)
  .min(EVENT_MIN_START_HOUR, `Hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.`)
  .max(EVENT_MAX_END_HOUR, `Hour must be ${EVENT_MIN_START_HOUR}–${EVENT_MAX_END_HOUR}.`);

const messageField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(EVENT_MESSAGE_MAX, `Message must be ${EVENT_MESSAGE_MAX} characters or fewer.`),
  );

const cancellationReasonField = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .max(
        CANCELLATION_REASON_MAX,
        `Cancellation reason must be ${CANCELLATION_REASON_MAX} characters or fewer.`,
      ),
  );

const statusField = z.enum(EVENT_STATUSES, {
  message: `status must be one of: ${EVENT_STATUSES.join(', ')}`,
});

// Schema factory — past-date enforcement depends on context. Create routes
// always reject past dates; the PATCH route allows them when editing an
// event that's already past `scheduled` (live / completed / cancelled).
export function makeEventInputSchema(opts: { allowPast: boolean }) {
  return z
    .object({
      date: dateField,
      startHour: hourField,
      endHour: hourField,
      message: messageField.optional(),
    })
    .superRefine((data, ctx) => {
      const errors = validateEventInput(data, { allowPastForEdit: opts.allowPast });
      for (const err of errors) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [err.field],
          message: err.message,
        });
      }
    });
}

// POST /api/events — full create body, past dates always rejected.
export const eventCreateSchema = makeEventInputSchema({ allowPast: false });
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// PATCH /api/events/[id] — every field optional. The route merges body
// against the existing document, then re-runs the cross-field check via
// `makeEventInputSchema` with the right `allowPast` for the event's state.
export const eventPatchSchema = z
  .object({
    date: dateField.optional(),
    startHour: hourField.optional(),
    endHour: hourField.optional(),
    message: messageField.optional(),
    status: statusField.optional(),
    cancellationReason: cancellationReasonField.optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'No editable fields supplied',
  });
export type EventPatchInput = z.infer<typeof eventPatchSchema>;
