import { Schema, model, models, type Model } from 'mongoose';

export const SHIFT_COLORS = ['tangelo', 'marcus', 'elena', 'sam', 'maya', 'delivery'] as const;
export type ShiftColor = (typeof SHIFT_COLORS)[number];

export type Shift = {
  weekStart: Date;   // Monday 00:00 UTC of the displayed week
  dayOfWeek: number; // 0 = Mon … 6 = Sun
  hourIndex: number; // 0 = 8 AM … 8 = 4 PM
  staffName: string;
  role: string;
  color: ShiftColor;
};

const ShiftSchema = new Schema<Shift>(
  {
    weekStart:  { type: Date, required: true, index: true },
    dayOfWeek:  { type: Number, required: true, min: 0, max: 6 },
    hourIndex:  { type: Number, required: true, min: 0, max: 8 },
    staffName:  { type: String, required: true, trim: true },
    role:       { type: String, default: '', trim: true },
    color:      { type: String, enum: [...SHIFT_COLORS], default: 'marcus' },
  },
  { timestamps: true },
);

// One shift per cell — backstops the application-level collision check in
// `lib/shifts.ts` so a race between two concurrent POSTs can't double-book
// the same hour slot.
ShiftSchema.index({ weekStart: 1, dayOfWeek: 1, hourIndex: 1 }, { unique: true });

const ShiftModel =
  (models.Shift as Model<Shift> | undefined) ??
  model<Shift>('Shift', ShiftSchema);

export default ShiftModel;
