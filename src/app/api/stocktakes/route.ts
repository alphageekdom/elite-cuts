import { NextResponse } from 'next/server';
import mongoose, { type ClientSession } from 'mongoose';

import StocktakeModel, { type StocktakeEntry } from '@/models/Stocktake';
import ProductModel from '@/models/Product';
import { withAdmin, withAdminNonDemo, zodBadRequest } from '@/lib/api-handler';
import { withOptionalTransaction } from '@/lib/db/transaction';
import { stocktakeCreateSchema, type StocktakeCreateInput } from '@/lib/stocktakes/schema';

export const dynamic = 'force-dynamic';

type InputEntry = StocktakeCreateInput['entries'][number];

// Apply the stock deltas and persist the stocktake. Uses a Mongo transaction
// when the deployment supports it (replica set / Atlas); falls back to
// sequential updates on standalone Mongo (typical dev setup).
async function commitStocktake(
  startedBy: string,
  entries: InputEntry[],
  note: string,
  session: ClientSession | null,
): Promise<{ stocktake: Awaited<ReturnType<typeof StocktakeModel.create>>[number]; }> {
  // Fetch current stock for every product in one round-trip.
  const productIds = entries.map((e) => new mongoose.Types.ObjectId(e.productId));
  const productsQuery = ProductModel.find(
    { _id: { $in: productIds } },
    'stockCount',
  );
  if (session) productsQuery.session(session);
  const products = await productsQuery.lean().exec();

  const stockByProductId = new Map<string, number>(
    products.map((p) => [p._id.toString(), p.stockCount]),
  );

  const stocktakeEntries: StocktakeEntry[] = entries.map((e) => {
    const previousStock = stockByProductId.get(e.productId) ?? 0;
    return {
      productId: new mongoose.Types.ObjectId(e.productId),
      previousStock,
      countedStock: e.countedStock,
      delta: e.countedStock - previousStock,
    };
  });

  // Apply each product's new stock value. Sequential per product is fine —
  // hundreds of cuts at most. `$set` with the absolute count avoids racing
  // any in-flight order decrements (the stocktake is authoritative).
  for (const entry of stocktakeEntries) {
    const update = ProductModel.updateOne(
      { _id: entry.productId },
      { $set: { stockCount: entry.countedStock } },
    );
    if (session) update.session(session);
    await update.exec();
  }

  const [stocktake] = await StocktakeModel.create(
    [{ startedBy, entries: stocktakeEntries, note }],
    session ? { session } : undefined,
  );
  return { stocktake };
}

export const POST = withAdminNonDemo(async (req, _ctx, userId) => {
  try {
    const parsed = stocktakeCreateSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid stocktake input');
    const { entries, note } = parsed.data;

    // Verify every productId resolves to a real, active catalog row before
    // recording the stocktake — keeps orphan entries and soft-deleted
    // products out of the audit trail, and stays aligned with the inventory
    // page's `isActive: { $ne: false }` filter.
    const productObjectIds = entries.map((e) => new mongoose.Types.ObjectId(e.productId));
    const existing = await ProductModel.find(
      { _id: { $in: productObjectIds }, isActive: { $ne: false } },
      '_id',
    ).lean();
    if (existing.length !== productObjectIds.length) {
      const known = new Set(existing.map((p) => p._id.toString()));
      const missing = entries.find((e) => !known.has(e.productId))?.productId;
      return NextResponse.json(
        { message: `Unknown or inactive product${missing ? `: ${missing}` : ''}` },
        { status: 400 },
      );
    }

    const result = await withOptionalTransaction((session) =>
      commitStocktake(userId, entries, note, session),
    );

    return NextResponse.json({ data: result.stocktake }, { status: 201 });
  } catch (error) {
    console.error('[stocktakes POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const GET = withAdmin(async (req) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(new URL(req.url).searchParams.get('limit') ?? '20', 10) || 20),
    );
    const docs = await StocktakeModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return NextResponse.json({ items: docs, total: docs.length });
  } catch (error) {
    console.error('[stocktakes GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
