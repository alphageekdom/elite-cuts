import { Schema, model, models, type Model } from 'mongoose';
import { DEFAULT_SHOP_SETTINGS } from '@/lib/shop-settings/defaults';
import {
  DORMANCY_THRESHOLD_VALUES,
  DORMANCY_OPTIONS,
  type DormancyThreshold,
} from '@/lib/shop-settings/constants';

// Re-export so existing server-side imports (`from '@/models/ShopSettings'`)
// keep working without each consumer chasing the constants file.
export { DORMANCY_THRESHOLD_VALUES, DORMANCY_OPTIONS };
export type { DormancyThreshold };

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
  // Privacy / lifecycle
  dormancyWarningMonths: DormancyThreshold; // 0 disables the dormancy scan entirely
};

// Schema field defaults read from the shared `DEFAULT_SHOP_SETTINGS` snapshot
// so the model, the lib fallback, the demo seed, and the client pre-resolve
// state can't drift apart on the same value.
const D = DEFAULT_SHOP_SETTINGS;

const ShopSettingsSchema = new Schema<ShopSettings>(
  {
    shopName:             { type: String, default: D.shopName },
    tagline:              { type: String, default: D.tagline },
    description:          { type: String, default: D.description },
    phone:                { type: String, default: D.phone },
    email:                { type: String, default: D.email },
    website:              { type: String, default: D.website },
    street:               { type: String, default: D.street },
    suite:                { type: String, default: D.suite },
    city:                 { type: String, default: D.city },
    state:                { type: String, default: D.state },
    zip:                  { type: String, default: D.zip },
    timezone:             { type: String, default: D.timezone },
    opensAt:              { type: String, default: D.opensAt },
    slotsPerHour:         { type: Number, default: D.slotsPerHour, min: 1, max: 60 },
    leadTime:             { type: String, default: D.leadTime },
    maxBookingWindow:     { type: String, default: D.maxBookingWindow },
    notifNewOrder:        { type: Boolean, default: D.notifNewOrder },
    notifLowStock:        { type: Boolean, default: D.notifLowStock },
    notifNewEvent:        { type: Boolean, default: D.notifNewEvent },
    pointsPerDollar:      { type: Number, default: D.pointsPerDollar, min: 0 },
    weekendMultiplier:    { type: Number, default: D.weekendMultiplier, min: 1, max: 10 },
    pointsExpiryMonths:   { type: Number, default: D.pointsExpiryMonths, min: 0 },
    redemptionPoints:     { type: Number, default: D.redemptionPoints, min: 1 },
    redemptionDollars:    { type: Number, default: D.redemptionDollars, min: 0 },
    minToRedeem:          { type: Number, default: D.minToRedeem, min: 0 },
    maxRedemptionPercent: { type: Number, default: D.maxRedemptionPercent, min: 1, max: 100 },
    maxRedemptionDollars: { type: Number, default: D.maxRedemptionDollars, min: 0 },
    connoisseurThreshold: { type: Number, default: D.connoisseurThreshold, min: 0 },
    masterCutThreshold:   { type: Number, default: D.masterCutThreshold, min: 0 },
    tierWindowMonths:     { type: Number, default: D.tierWindowMonths, min: 0, max: 120 },
    dormancyWarningMonths:{ type: Number, default: D.dormancyWarningMonths, enum: [...DORMANCY_THRESHOLD_VALUES] },
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
