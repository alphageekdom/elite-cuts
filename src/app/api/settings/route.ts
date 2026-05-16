import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import ShopSettings, { type ShopSettings as ShopSettingsType } from '@/models/ShopSettings';
import { withAdmin } from '@/lib/api-handler';

// Whitelist of fields the admin form binds to. Restricting the GET response to
// these keys prevents stale fields from old schema versions (e.g. the old
// stringly-typed weekendMultiplier / redemptionRate) from overwriting the
// client's typed defaults when they linger in an existing settings doc.
const SETTINGS_FIELDS: (keyof ShopSettingsType)[] = [
  'shopName', 'tagline', 'description', 'phone', 'email', 'website',
  'street', 'suite', 'city', 'state', 'zip', 'timezone', 'opensAt',
  'slotsPerHour', 'leadTime', 'maxBookingWindow',
  'notifNewOrder', 'notifLowStock', 'notifNewEvent',
  'pointsPerDollar', 'weekendMultiplier', 'pointsExpiryMonths',
  'redemptionPoints', 'redemptionDollars', 'minToRedeem',
  'maxRedemptionPercent', 'maxRedemptionDollars',
  'connoisseurThreshold', 'masterCutThreshold', 'tierWindowMonths',
  'dormancyWarningMonths',
];

function pickSettings(doc: Record<string, unknown> | null): Partial<ShopSettingsType> {
  if (!doc) return {};
  const out: Partial<ShopSettingsType> = {};
  for (const key of SETTINGS_FIELDS) {
    const value = doc[key as string];
    if (value !== undefined && value !== null) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

// GET /api/settings — returns the singleton settings doc (creates defaults on first call)
export const GET = withAdmin(async () => {
  try {
    const settings = await ShopSettings.findOneAndUpdate(
      {},
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return NextResponse.json(pickSettings(settings as Record<string, unknown> | null));
  } catch (error) {
    console.error('[settings GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// PUT /api/settings — replaces writable fields on the singleton doc
export const PUT = withAdmin(async (request: NextRequest) => {
  try {
    const {
      shopName, tagline, description, phone, email, website,
      street, suite, city, state, zip, timezone, opensAt,
      slotsPerHour, leadTime, maxBookingWindow,
      notifNewOrder, notifLowStock, notifNewEvent,
      pointsPerDollar, weekendMultiplier, pointsExpiryMonths,
      redemptionPoints, redemptionDollars, minToRedeem,
      maxRedemptionPercent, maxRedemptionDollars,
      connoisseurThreshold, masterCutThreshold, tierWindowMonths,
      dormancyWarningMonths,
    } = await request.json() as Partial<ShopSettingsType>;

    const rawPatch = {
      shopName, tagline, description, phone, email, website,
      street, suite, city, state, zip, timezone, opensAt,
      slotsPerHour, leadTime, maxBookingWindow,
      notifNewOrder, notifLowStock, notifNewEvent,
      pointsPerDollar, weekendMultiplier, pointsExpiryMonths,
      redemptionPoints, redemptionDollars, minToRedeem,
      maxRedemptionPercent, maxRedemptionDollars,
      connoisseurThreshold, masterCutThreshold, tierWindowMonths,
      dormancyWarningMonths,
    };
    const patch = Object.fromEntries(
      Object.entries(rawPatch).filter(([, v]) => v !== undefined),
    );

    const settings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: patch },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
    ).lean();

    return NextResponse.json(pickSettings(settings as Record<string, unknown> | null));
  } catch (error) {
    // Schema-level validators (e.g. the enum on `dormancyWarningMonths`)
    // throw a ValidationError that's the client's fault — surface it as a
    // 400 with the offending message instead of a generic 500.
    if (error instanceof mongoose.Error.ValidationError) {
      const first = Object.values(error.errors)[0];
      return NextResponse.json(
        { message: first?.message ?? 'Invalid settings payload' },
        { status: 400 },
      );
    }
    console.error('[settings PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
