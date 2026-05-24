import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import ShopSettings, { type ShopSettings as ShopSettingsType } from '@/models/ShopSettings';
import { SHOP_SETTINGS_KEYS } from '@/lib/shopSettings/defaults';
import { withAdmin, withAdminNonDemo } from '@/lib/api-handler';
import { shopSettingsInputSchema } from '@/lib/settings/schema';

function pickSettings(doc: Record<string, unknown> | null): Partial<ShopSettingsType> {
  if (!doc) return {};
  const out: Partial<ShopSettingsType> = {};
  for (const key of SHOP_SETTINGS_KEYS) {
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

// PUT /api/settings — replaces writable fields on the singleton doc.
// `withAdminNonDemo` rejects demo-admin sessions with a 403 before the
// handler runs.
export const PUT = withAdminNonDemo(async (request: NextRequest) => {
  try {
    const parsed = shopSettingsInputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid settings payload' },
        { status: 400 },
      );
    }

    const settings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: parsed.data },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true },
    ).lean();

    return NextResponse.json({
      data: pickSettings(settings as Record<string, unknown> | null),
      message: 'Settings saved',
    });
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
