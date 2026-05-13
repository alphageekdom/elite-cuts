import { NextResponse, type NextRequest } from 'next/server';
import ShopSettings, { type ShopSettings as ShopSettingsType } from '@/models/ShopSettings';
import { withAdmin } from '@/lib/api-handler';

// GET /api/settings — returns the singleton settings doc (creates defaults on first call)
export const GET = withAdmin(async () => {
  try {
    const settings = await ShopSettings.findOneAndUpdate(
      {},
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return NextResponse.json(settings);
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
      pointsPerDollar, weekendMultiplier, pointsExpiry,
      redemptionRate, minToRedeem, connoisseurThreshold,
      masterCutThreshold, tierReset,
    } = await request.json() as Partial<ShopSettingsType>;

    const rawPatch = {
      shopName, tagline, description, phone, email, website,
      street, suite, city, state, zip, timezone, opensAt,
      slotsPerHour, leadTime, maxBookingWindow,
      notifNewOrder, notifLowStock, notifNewEvent,
      pointsPerDollar, weekendMultiplier, pointsExpiry,
      redemptionRate, minToRedeem, connoisseurThreshold,
      masterCutThreshold, tierReset,
    };
    const patch = Object.fromEntries(
      Object.entries(rawPatch).filter(([, v]) => v !== undefined),
    );

    const settings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: patch },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
    ).lean();

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[settings PUT]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
