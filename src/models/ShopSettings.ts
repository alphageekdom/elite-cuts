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
  notifNewEvent: boolean;
  // Rewards
  pointsPerDollar: number;
  weekendMultiplier: number;        // 1, 2, or 3 — applied when an order is fulfilled on Sat/Sun
  pointsExpiryMonths: number;       // 0 = never; otherwise number of months until award entries expire
  redemptionPoints: number;         // pts side of the conversion (e.g. 100)
  redemptionDollars: number;        // dollars side of the conversion (e.g. 5) — pairs with redemptionPoints
  minToRedeem: number;
  maxRedemptionPercent: number;     // 1..100, max % of subtotal payable with points (default 50)
  maxRedemptionDollars: number;     // flat $ ceiling per order (default 50). Effective cap = min(percent, flat)
  connoisseurThreshold: number;
  masterCutThreshold: number;
  tierWindowMonths: number;         // qualifying-period length in months (default 12, 0 = lifetime / no window)
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
    notifNewEvent:        { type: Boolean, default: true },
    pointsPerDollar:      { type: Number, default: 1, min: 0 },
    weekendMultiplier:    { type: Number, default: 1, min: 1, max: 10 },
    pointsExpiryMonths:   { type: Number, default: 6, min: 0 },
    redemptionPoints:     { type: Number, default: 100, min: 1 },
    redemptionDollars:    { type: Number, default: 5, min: 0 },
    minToRedeem:          { type: Number, default: 0, min: 0 },
    maxRedemptionPercent: { type: Number, default: 50, min: 1, max: 100 },
    maxRedemptionDollars: { type: Number, default: 50, min: 0 },
    connoisseurThreshold: { type: Number, default: 250, min: 0 },
    masterCutThreshold:   { type: Number, default: 1000, min: 0 },
    tierWindowMonths:     { type: Number, default: 12, min: 0 },
  },
  { timestamps: true },
);

// Dev re-registration guard — see Order.ts. ShopSettings got numeric field
// migrations in Phase A; stale cached models would silently drop them.
if (process.env.NODE_ENV !== 'production' && models.ShopSettings) {
  delete (models as Record<string, unknown>).ShopSettings;
}

const ShopSettingsModel =
  (models.ShopSettings as Model<ShopSettings> | undefined) ??
  model<ShopSettings>('ShopSettings', ShopSettingsSchema);

export default ShopSettingsModel;
