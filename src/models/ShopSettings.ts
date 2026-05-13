import { Schema, model, models, type Model } from 'mongoose';

export type ShopSettings = {
  // General
  shopName: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  timezone: string;
  opensAt: string;
  // Pickup
  slotsPerHour: number;
  leadTime: string;
  maxBookingWindow: string;
  // Notifications
  notifNewOrder: boolean;
  notifLowStock: boolean;
  notifDailySummary: boolean;
  notifWeeklyAnalytics: boolean;
  notifAgingRoom: boolean;
  notifDormantCustomers: boolean;
  // Rewards
  pointsPerDollar: number;
  weekendMultiplier: string;
  pointsExpiry: string;
  redemptionRate: string;
  minToRedeem: number;
  connoisseurThreshold: number;
  masterCutThreshold: number;
  tierReset: string;
};

const ShopSettingsSchema = new Schema<ShopSettings>(
  {
    shopName:             { type: String, default: 'EliteCuts' },
    tagline:              { type: String, default: 'Hand-cut meats, butchered fresh' },
    description:          { type: String, default: 'Hand-cut meats, butchered fresh in San Diego. Order online for same-day pickup.' },
    phone:                { type: String, default: '(619) 555-0142' },
    email:                { type: String, default: 'hello@elitecuts.com' },
    website:              { type: String, default: 'https://elitecuts.com' },
    street:               { type: String, default: '3045 30th Street' },
    suite:                { type: String, default: '' },
    city:                 { type: String, default: 'San Diego' },
    state:                { type: String, default: 'CA' },
    zip:                  { type: String, default: '92104' },
    timezone:             { type: String, default: 'America/Los_Angeles (PT)' },
    opensAt:              { type: String, default: '9:00 AM' },
    slotsPerHour:         { type: Number, default: 10 },
    leadTime:             { type: String, default: '30 min' },
    maxBookingWindow:     { type: String, default: 'Same day' },
    notifNewOrder:        { type: Boolean, default: true },
    notifLowStock:        { type: Boolean, default: true },
    notifDailySummary:    { type: Boolean, default: true },
    notifWeeklyAnalytics: { type: Boolean, default: false },
    notifAgingRoom:       { type: Boolean, default: true },
    notifDormantCustomers:{ type: Boolean, default: false },
    pointsPerDollar:      { type: Number, default: 1 },
    weekendMultiplier:    { type: String, default: '1× (none)' },
    pointsExpiry:         { type: String, default: '6 months' },
    redemptionRate:       { type: String, default: '100 pts = $5 off' },
    minToRedeem:          { type: Number, default: 0 },
    connoisseurThreshold: { type: Number, default: 250 },
    masterCutThreshold:   { type: Number, default: 1000 },
    tierReset:            { type: String, default: 'Never (lifetime)' },
  },
  { timestamps: true },
);

const ShopSettingsModel =
  (models.ShopSettings as Model<ShopSettings> | undefined) ??
  model<ShopSettings>('ShopSettings', ShopSettingsSchema);

export default ShopSettingsModel;
