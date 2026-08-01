import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import ShopSettings, { type ShopSettings as ShopSettingsType } from '@/models/ShopSettings';
import User from '@/models/User';
import { SHOP_SETTINGS_KEYS } from '@/lib/shop-settings/defaults';
import { withAdmin, zodBadRequest } from '@/lib/api-handler';
import { isDemoAdmin } from '@/lib/auth/demo-permissions';
import { shopSettingsInputSchema } from '@/lib/shop-settings/schema';

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
//
// Open to demo admins, with ONE field held back. The openness rests on the
// nightly restore undoing whatever a demo session changes here — but
// `dormancyWarningMonths` is deliberately excluded from that restore, because
// it decides whether the shop auto-deletes inactive customer accounts and an
// operator who switches it off must not have it silently re-armed each night.
// Those two facts together would hand anyone holding the public demo-admin
// credentials permanent control of a sweep that warns, soft-deletes and then
// purges REAL registered accounts. Stripping the field from demo writes keeps
// both properties: a real operator's choice survives the restore, and a demo
// visitor cannot make a choice that needs surviving.
export const PUT = withAdmin(async (request: NextRequest, _ctx, userId) => {
  try {
    const parsed = shopSettingsInputSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid settings payload');

    const actor = await User.findById(userId).select('isDemo isAdmin').lean();
    const { dormancyWarningMonths: _demoHeldBack, ...withoutDormancy } = parsed.data;
    const update = isDemoAdmin(actor) ? withoutDormancy : parsed.data;

    const settings = await ShopSettings.findOneAndUpdate(
      {},
      { $set: update },
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
