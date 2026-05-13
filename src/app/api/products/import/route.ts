import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

import ProductModel from '@/models/Product';
import { withAdmin } from '@/lib/api-handler';
import { parseCsv, csvRowsToRecords } from '@/lib/csv-parse';
import { validateProductInput, type ProductInput } from '@/lib/product-validate';
import { slugify } from '@/lib/slugify';

// Mongoose's `bulkWrite` bypasses pre-save / pre-validate hooks on inserts and
// only runs schema validators on updates when explicitly asked. That's fine
// here because every doc has already passed through `validateProductInput`
// above — the validator carries the same invariants the model would enforce
// (category enum, unit enum, non-negative price, integer stock, slug present
// and URL-safe). If you wire a new code path that hits this endpoint, make
// sure it goes through the validator too; the model alone won't catch every
// constraint at bulk-write time.

export const dynamic = 'force-dynamic';

// Columns the export route emits; the import accepts the same shape. `slug`
// is the upsert key (existing slug → update, new slug → create). If a row's
// slug column is blank, the validator derives it from `name`.
const REQUIRED_HEADERS = [
  'slug',
  'name',
  'description',
  'category',
  'price',
  'unit',
  'stock',
  'isFeatured',
  'isActive',
  'supplier',
] as const;

type DiffField = keyof ProductInput;
type DiffEntry = { field: DiffField; from: unknown; to: unknown };

type RowResult =
  | { index: number; status: 'create'; slug: string; name: string; diff?: never; error?: never; warnings?: string[] }
  | { index: number; status: 'update'; slug: string; name: string; diff: DiffEntry[]; error?: never; warnings?: string[] }
  | { index: number; status: 'skip';   slug: string; name: string; diff?: never; error?: never; warnings?: string[] }
  | { index: number; status: 'error';  slug: string; name: string; diff?: never; error: string;  warnings?: never };

// Build the per-row diff against an existing product, plus any warning chips
// the admin should see before committing.
function diffAgainstExisting(
  parsed: ProductInput,
  existing: {
    slug: string;
    name: string;
    description: string;
    category: string;
    price: number;
    unit?: string;
    stockCount: number;
    isFeatured: boolean;
    isActive: boolean;
    supplier?: string;
  },
): { diff: DiffEntry[]; warnings: string[] } {
  const diff: DiffEntry[] = [];
  const warnings: string[] = [];

  if (parsed.name !== existing.name) {
    diff.push({ field: 'name', from: existing.name, to: parsed.name });
    if (parsed.slug === existing.slug) {
      warnings.push('Slug matches an existing product but the name differs — confirm this is a rename');
    }
  }
  if (parsed.description !== existing.description) diff.push({ field: 'description', from: existing.description, to: parsed.description });
  if (parsed.category !== existing.category) diff.push({ field: 'category', from: existing.category, to: parsed.category });
  if (parsed.price !== existing.price) {
    diff.push({ field: 'price', from: existing.price, to: parsed.price });
    if (existing.price > 0) {
      const delta = Math.abs(parsed.price - existing.price) / existing.price;
      if (delta > 0.5) warnings.push('Price change is unusually large (>50%)');
    }
  }
  if (parsed.unit !== (existing.unit ?? 'lb')) diff.push({ field: 'unit', from: existing.unit ?? 'lb', to: parsed.unit });
  if (parsed.stock !== existing.stockCount) diff.push({ field: 'stock', from: existing.stockCount, to: parsed.stock });
  if (parsed.isFeatured !== existing.isFeatured) diff.push({ field: 'isFeatured', from: existing.isFeatured, to: parsed.isFeatured });
  if (parsed.isActive !== existing.isActive) diff.push({ field: 'isActive', from: existing.isActive, to: parsed.isActive });
  if (parsed.supplier !== (existing.supplier ?? '')) diff.push({ field: 'supplier', from: existing.supplier ?? '', to: parsed.supplier });
  return { diff, warnings };
}

async function readCsvFromRequest(req: Request): Promise<{ csv?: string; error?: string }> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return { error: 'No file provided' };
    if (file.size > 1024 * 1024) return { error: 'CSV exceeds 1 MB limit' };
    if (!file.name.toLowerCase().endsWith('.csv')) return { error: 'File must be .csv' };
    return { csv: await file.text() };
  }
  if (contentType.includes('application/json')) {
    const body = (await req.json()) as { csv?: string };
    if (typeof body.csv !== 'string' || !body.csv) return { error: 'Missing csv field' };
    if (body.csv.length > 1024 * 1024) return { error: 'CSV exceeds 1 MB limit' };
    return { csv: body.csv };
  }
  return { error: 'Unsupported Content-Type — use multipart/form-data or application/json' };
}

// Mongoose typing for bulkWrite is generic enough that hand-building the ops
// types here keeps the call site readable without `any` casts.
type ProductDoc = {
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stockCount: number;
  isFeatured: boolean;
  isActive: boolean;
  supplier: string;
};

const toDoc = (d: ProductInput): ProductDoc => ({
  slug: d.slug,
  name: d.name,
  description: d.description,
  category: d.category,
  price: d.price,
  unit: d.unit,
  stockCount: d.stock,
  isFeatured: d.isFeatured,
  isActive: d.isActive,
  supplier: d.supplier,
});

export const POST = withAdmin(async (req) => {
  try {
    const { csv, error } = await readCsvFromRequest(req);
    if (error) return NextResponse.json({ message: error }, { status: 400 });
    if (!csv) return NextResponse.json({ message: 'Empty CSV' }, { status: 400 });

    const url = new URL(req.url);
    const commit = url.searchParams.get('commit') === 'true';

    const rows = parseCsv(csv);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'CSV is empty' }, { status: 400 });
    }
    const { headers, records } = csvRowsToRecords(rows);

    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
      return NextResponse.json(
        { message: `CSV is missing required column(s): ${missing.join(', ')}` },
        { status: 400 },
      );
    }
    if (records.length === 0) {
      return NextResponse.json({ message: 'CSV has no data rows' }, { status: 400 });
    }
    if (records.length > 1000) {
      return NextResponse.json({ message: 'Import limited to 1000 rows per call' }, { status: 400 });
    }

    // Validate every row up front. Errored rows surface in the per-row
    // results; valid rows continue through dedup + diff.
    type Validated = { index: number; data: ProductInput };
    const validated: Validated[] = [];
    const results: RowResult[] = [];
    records.forEach((rec, i) => {
      const v = validateProductInput(rec);
      if (!v.ok) {
        const fallbackSlug = rec.slug?.trim() || (rec.name ? slugify(rec.name) : `row-${i + 1}`);
        results.push({ index: i, status: 'error', slug: fallbackSlug, name: rec.name ?? '', error: v.error });
      } else {
        validated.push({ index: i, data: v.data });
      }
    });

    // Two CSV rows that resolve to the same slug would race during commit;
    // surface a clear error on the duplicates so the admin can fix them.
    const seenSlugs = new Map<string, number>();
    const deduped: Validated[] = [];
    for (const v of validated) {
      const first = seenSlugs.get(v.data.slug);
      if (first !== undefined) {
        results.push({
          index: v.index,
          status: 'error',
          slug: v.data.slug,
          name: v.data.name,
          error: `Duplicate slug — row ${first + 1} already uses "${v.data.slug}"`,
        });
        continue;
      }
      seenSlugs.set(v.data.slug, v.index);
      deduped.push(v);
    }

    // Look up every existing product in one query. Match by slug first; for
    // legacy docs without a slug (pre-migration), fall back to a case-
    // insensitive name match so the import can re-key them in place.
    const slugList = deduped.map((v) => v.data.slug);
    const nameList = deduped.map((v) => v.data.name);
    const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePatterns = nameList.map((n) => new RegExp(`^${escapeRe(n)}$`, 'i'));
    const existingDocs = await ProductModel.find(
      {
        $or: [
          { slug: { $in: slugList } },
          { $and: [{ $or: [{ slug: { $exists: false } }, { slug: '' }] }, { name: { $in: namePatterns } }] },
        ],
      },
      '_id slug name description category price unit stockCount isFeatured isActive supplier',
    ).lean();

    const existingBySlug = new Map<string, (typeof existingDocs)[number]>();
    const existingByName = new Map<string, (typeof existingDocs)[number]>();
    for (const d of existingDocs) {
      if (d.slug) existingBySlug.set(d.slug, d);
      else existingByName.set(d.name.trim().toLowerCase(), d);
    }

    type BulkOp =
      | { kind: 'update'; matchId: mongoose.Types.ObjectId; doc: ProductDoc }
      | { kind: 'insert'; doc: ProductDoc };
    const bulkOps: BulkOp[] = [];

    for (const { index, data } of deduped) {
      const bySlug = existingBySlug.get(data.slug);
      const byName = bySlug ? undefined : existingByName.get(data.name.toLowerCase());
      const existing = bySlug ?? byName;

      if (!existing) {
        results.push({ index, status: 'create', slug: data.slug, name: data.name });
        bulkOps.push({ kind: 'insert', doc: toDoc(data) });
        continue;
      }

      const { diff, warnings } = diffAgainstExisting(data, existing);
      // Legacy docs that matched by name are getting their slug filled in,
      // which is a real change even when no other field moves.
      const legacyBackfill = !existing.slug;
      if (diff.length === 0 && !legacyBackfill) {
        results.push({ index, status: 'skip', slug: data.slug, name: data.name });
        continue;
      }
      results.push({
        index,
        status: 'update',
        slug: data.slug,
        name: data.name,
        diff,
        warnings: warnings.length ? warnings : undefined,
      });
      bulkOps.push({ kind: 'update', matchId: existing._id, doc: toDoc(data) });
    }

    const summary = {
      create: results.filter((r) => r.status === 'create').length,
      update: results.filter((r) => r.status === 'update').length,
      skip:   results.filter((r) => r.status === 'skip').length,
      error:  results.filter((r) => r.status === 'error').length,
    };

    if (!commit) {
      return NextResponse.json({ rows: results, summary });
    }
    if (summary.error > 0) {
      return NextResponse.json(
        {
          message: 'Cannot commit — fix the error rows first or re-import without them',
          rows: results,
          summary,
        },
        { status: 400 },
      );
    }

    const writes = bulkOps.map((op) =>
      op.kind === 'update'
        ? { updateOne: { filter: { _id: op.matchId }, update: { $set: op.doc } } }
        : { insertOne: { document: op.doc } },
    );

    // Try a real transaction first — production deployments on Atlas (or any
    // replica set) get true atomicity. Local single-node Mongo lacks
    // transaction support, so we catch the specific failure and fall back to
    // an ordered bulkWrite. The fallback is still safe to retry: slug-keyed
    // upsert + per-row diff means re-importing the same CSV is a no-op for
    // rows that were already applied.
    let committedCount = 0;
    if (writes.length) {
      let usedTransaction = false;
      try {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const result = await ProductModel.bulkWrite(writes, { session, ordered: true });
            committedCount = (result.insertedCount ?? 0) + (result.modifiedCount ?? 0);
          });
          usedTransaction = true;
        } finally {
          session.endSession();
        }
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : '';
        const isReplicaSetLimit =
          msg.includes('replica set') ||
          msg.includes('Transaction numbers') ||
          msg.includes('IllegalOperation');
        if (!isReplicaSetLimit) throw txErr;
      }
      if (!usedTransaction) {
        const result = await ProductModel.bulkWrite(writes, { ordered: true });
        committedCount = (result.insertedCount ?? 0) + (result.modifiedCount ?? 0);
      }
    }

    return NextResponse.json({ rows: results, summary, committedCount });
  } catch (error) {
    console.error('[products import POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
