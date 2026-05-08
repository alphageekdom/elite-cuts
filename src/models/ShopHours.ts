import { Schema, model, models, type Model } from 'mongoose';

export type ShopHoursDay = {
  dayOfWeek: number; // 0 = Mon … 6 = Sun
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

// Singleton: one document holds all 7 days
export type ShopHours = {
  days: ShopHoursDay[];
};

const ShopHoursDaySchema = new Schema<ShopHoursDay>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    opensAt:   { type: String, default: '9:00 AM' },
    closesAt:  { type: String, default: '7:00 PM' },
    isClosed:  { type: Boolean, default: false },
  },
  { _id: false },
);

const DEFAULT_DAYS: ShopHoursDay[] = [
  { dayOfWeek: 0, opensAt: '',         closesAt: '',         isClosed: true  },
  { dayOfWeek: 1, opensAt: '9:00 AM',  closesAt: '7:00 PM',  isClosed: false },
  { dayOfWeek: 2, opensAt: '9:00 AM',  closesAt: '7:00 PM',  isClosed: false },
  { dayOfWeek: 3, opensAt: '9:00 AM',  closesAt: '7:00 PM',  isClosed: false },
  { dayOfWeek: 4, opensAt: '9:00 AM',  closesAt: '7:00 PM',  isClosed: false },
  { dayOfWeek: 5, opensAt: '9:00 AM',  closesAt: '7:00 PM',  isClosed: false },
  { dayOfWeek: 6, opensAt: '10:00 AM', closesAt: '4:00 PM',  isClosed: false },
];

const ShopHoursSchema = new Schema<ShopHours>(
  { days: { type: [ShopHoursDaySchema], default: DEFAULT_DAYS } },
  { timestamps: true },
);

const ShopHoursModel =
  (models.ShopHours as Model<ShopHours> | undefined) ??
  model<ShopHours>('ShopHours', ShopHoursSchema);

export default ShopHoursModel;
export { DEFAULT_DAYS };
