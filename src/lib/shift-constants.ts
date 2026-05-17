// Client-safe constants for shift records. Lives outside `models/Shift.ts`
// so client components can import the color palette without pulling Mongoose
// (and its server-only `async_hooks` dependency) into the browser bundle.

export const SHIFT_COLORS = ['tangelo', 'marcus', 'elena', 'sam', 'maya', 'delivery'] as const;
export type ShiftColor = (typeof SHIFT_COLORS)[number];
