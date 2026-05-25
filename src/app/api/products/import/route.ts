import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

import ProductModel from '@/models/Product';
import { withAdminNonDemo } from '@/lib/api-handler';
import { parseCsv, csvRowsToRecords } from '@/lib/csv/parse';
import { withOptionalTransaction } from '@/lib/db/transaction';
import { escapeRegex } from '@/lib/regex-escape';
import { productInputSchema, flattenProductIssues, type ProductInput } from '@/lib/products/schema';
import { coerceProductInput } from '@/lib/products/parse-form-input';
import {
  CSV_COLUMNS,
  EXISTING_PRODUCT_PROJECTION,
  classifyRow,
  dedupeBySlug,
  toProductDoc,
  type ExistingProductRow,
  type ProductDoc,
  type RowResult,
} from '@/lib/products/import';
import { slugify } from '@/lib/slugify';

// Mongoose's `bulkWrite` bypasses pre-save / pre-validate hooks on inserts
// and only runs schema validators on updates when explicitly asked. That's
// fine here because every doc has already passed through
// `productInputSchema` above and `toProductDoc` calls
// `stampPricingDerivedFields` directly — the helper is the same one the
// model's pre-validate hook uses, so the canonical and stamped fields
// can't drift between the two paths. If you wire a new code path that hits
// this endpoint, route it through the same schema + builder.

export const dynamic = 'force-dynamic';

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

export const POST = withAdminNonDemo(async (req) => {
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

    const missing = CSV_COLUMNS.filter((h) => !headers.includes(h));
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
      const parsed = productInputSchema.safeParse(coerceProductInput(rec));
      if (!parsed.success) {
        const flat = flattenProductIssues(parsed.error.issues);
        const firstKey = Object.keys(flat)[0] ?? '_';
        const firstMessage = flat[firstKey] ?? 'Row is invalid';
        const fallbackSlug = rec.slug?.trim() || (rec.name ? slugify(rec.name) : `row-${i + 1}`);
        results.push({ index: i, status: 'error', slug: fallbackSlug, name: rec.name ?? '', error: firstMessage });
      } else {
        validated.push({ index: i, data: parsed.data });
      }
    });

    // Two CSV rows that resolve to the same slug would race during commit;
    // dedupeBySlug surfaces them as row-level errors so the admin can fix
    // them before re-uploading.
    const { kept: deduped, duplicates } = dedupeBySlug(validated);
    for (const dup of duplicates) {
      results.push({
        index: dup.item.index,
        status: 'error',
        slug: dup.slug,
        name: dup.item.data.name,
        error: `Duplicate slug — row ${dup.firstIndex + 1} already uses "${dup.slug}"`,
      });
    }

    // Look up every existing product in one query. Match by slug first; for
    // legacy docs without a slug (pre-migration), fall back to a case-
    // insensitive name match so the import can re-key them in place.
    const slugList = deduped.map((v) => v.data.slug ?? slugify(v.data.name));
    const nameList = deduped.map((v) => v.data.name);
    const namePatterns = nameList.map((n) => new RegExp(`^${escapeRegex(n)}$`, 'i'));
    const existingDocs = (await ProductModel.find(
      {
        $or: [
          { slug: { $in: slugList } },
          { $and: [{ $or: [{ slug: { $exists: false } }, { slug: '' }] }, { name: { $in: namePatterns } }] },
        ],
      },
      EXISTING_PRODUCT_PROJECTION,
    ).lean()) as unknown as ExistingProductRow[];

    const existingBySlug = new Map<string, ExistingProductRow>();
    const existingByName = new Map<string, ExistingProductRow>();
    for (const d of existingDocs) {
      if (d.slug) existingBySlug.set(d.slug, d);
      else existingByName.set(d.name.trim().toLowerCase(), d);
    }

    type BulkOp =
      | { kind: 'update'; matchId: mongoose.Types.ObjectId; doc: ProductDoc }
      | { kind: 'insert'; doc: ProductDoc };
    const bulkOps: BulkOp[] = [];

    for (const { index, data } of deduped) {
      const slug = data.slug ?? slugify(data.name);
      const bySlug = existingBySlug.get(slug);
      const byName = bySlug ? undefined : existingByName.get(data.name.toLowerCase());
      const existing = bySlug ?? byName;
      const outcome = classifyRow(data, existing);
      const doc = toProductDoc(data);

      if (outcome.status === 'create') {
        results.push({ index, status: 'create', slug, name: data.name });
        bulkOps.push({ kind: 'insert', doc });
      } else if (outcome.status === 'skip') {
        results.push({ index, status: 'skip', slug, name: data.name });
      } else {
        results.push({
          index,
          status: 'update',
          slug,
          name: data.name,
          diff: outcome.diff,
          warnings: outcome.warnings.length ? outcome.warnings : undefined,
        });
        // existing is defined whenever classifyRow returned 'update'
        bulkOps.push({ kind: 'update', matchId: existing!._id as mongoose.Types.ObjectId, doc });
      }
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
    // transaction support, so the shared helper falls back to an ordered
    // bulkWrite without a session. The fallback is still safe to retry:
    // slug-keyed upsert + per-row diff means re-importing the same CSV is a
    // no-op for rows that were already applied.
    let committedCount = 0;
    if (writes.length) {
      committedCount = await withOptionalTransaction(async (session) => {
        const result = await ProductModel.bulkWrite(
          writes,
          session ? { session, ordered: true } : { ordered: true },
        );
        return (result.insertedCount ?? 0) + (result.modifiedCount ?? 0);
      });
    }

    return NextResponse.json({ rows: results, summary, committedCount });
  } catch (error) {
    console.error('[products import POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
