import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { type ClientSession } from 'mongoose';

import StocktakeModel, { type StocktakeEntry } from '@/models/Stocktake';
import ProductModel from '@/models/Product';
import { withAdmin } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

type InputEntry = {
  productId: string;
  countedStock: number;
};

function parseEntries(raw: unknown): InputEntry[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'At least one entry is required' };
  }
  const out: InputEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') return { error: 'Invalid entry shape' };
    const productId = (e as { productId?: unknown }).productId;
    const countedStock = (e as { countedStock?: unknown }).countedStock;
    if (typeof productId !== 'string' || !mongoose.isValidObjectId(productId)) {
      return { error: 'Invalid productId' };
    }
    if (typeof countedStock !== 'number' || !Number.isInteger(countedStock) || countedStock < 0) {
      return { error: 'countedStock must be a non-negative integer' };
    }
    out.push({ productId, countedStock });
  }
  return out;
}

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

export const POST = withAdmin(async (req, _ctx, userId) => {
  try {
    const body = await req.json();
    const parsed = parseEntries(body?.entries);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ message: parsed.error }, { status: 400 });
    }
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : '';

    // Verify every productId resolves to a real catalog row before recording
    // the stocktake — keeps orphan entries out of the audit trail.
    const productObjectIds = parsed.map((e) => new mongoose.Types.ObjectId(e.productId));
    const existing = await ProductModel.find({ _id: { $in: productObjectIds } }, '_id').lean();
    if (existing.length !== productObjectIds.length) {
      const known = new Set(existing.map((p) => p._id.toString()));
      const missing = parsed.find((e) => !known.has(e.productId))?.productId;
      return NextResponse.json(
        { message: `Unknown product${missing ? `: ${missing}` : ''}` },
        { status: 400 },
      );
    }

    // Try a transaction; gracefully fall back if the deployment doesn't
    // support one (standalone Mongo throws "Transaction numbers are only
    // allowed on a replica set member or mongos").
    let result;
    let session: ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      result = await session.withTransaction(() =>
        commitStocktake(userId, parsed, note, session),
      );
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : '';
      const isStandalone = /replica set|Transaction numbers|standalone/i.test(message);
      if (!isStandalone) throw txErr;
      // Best-effort sequential commit on standalone Mongo.
      result = await commitStocktake(userId, parsed, note, null);
    } finally {
      if (session) await session.endSession();
    }

    return NextResponse.json(result.stocktake, { status: 201 });
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
    return NextResponse.json(docs);
  } catch (error) {
    console.error('[stocktakes GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
