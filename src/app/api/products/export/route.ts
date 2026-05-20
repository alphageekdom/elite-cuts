import { NextResponse } from 'next/server';

import ProductModel, { type Product } from '@/models/Product';
import { withAdmin } from '@/lib/api-handler';
import { toCsv, csvFilename } from '@/lib/csv';
import { PRODUCT_CATEGORIES } from '@/lib/admin-constants';
import {
  matchesProductStatus,
  parseProductSortMode,
  parseProductStatus,
  type ProductSortMode,
} from '@/lib/admin-products';
import { slugify } from '@/lib/slugify';
import { CSV_COLUMNS } from '@/lib/products/import';

export const dynamic = 'force-dynamic';

// Format a number column. Blank for undefined so a round-trip leaves
// optional fields blank rather than the literal string "0". Two decimals
// for money-like columns (prices) and bare numbers otherwise — toFixed(2)
// is what `formatMoney` writes elsewhere in the codebase, kept consistent
// here for the human-readable export.
const fmtMoney = (n: number | undefined) => (typeof n === 'number' ? n.toFixed(2) : '');
const fmtNum = (n: number | undefined) => (typeof n === 'number' ? String(n) : '');
const fmtBool = (b: boolean | undefined) => (b ? 'true' : 'false');

// Fixed column order — the import endpoint expects the same headers in the
// same positions. The CSV_COLUMNS constant is the shared source of truth
// for both routes; this map writes a cell value per column. Legacy docs
// that pre-date the slug field get one derived on the fly so a round-
// trip still works.
const EXPORT_COLUMNS: { header: typeof CSV_COLUMNS[number]; value: (p: Product) => unknown }[] = [
  { header: 'slug',              value: (p) => p.slug || slugify(p.name) },
  { header: 'name',              value: (p) => p.name },
  { header: 'description',       value: (p) => p.description },
  { header: 'category',          value: (p) => p.category },
  { header: 'cutType',           value: (p) => p.cutType ?? '' },
  { header: 'qualityTier',       value: (p) => p.qualityTier ?? '' },
  { header: 'pricingType',       value: (p) => p.pricingType ?? '' },
  { header: 'packagePrice',      value: (p) => fmtMoney(p.packagePrice) },
  { header: 'packageWeightLb',   value: (p) => fmtNum(p.packageWeightLb) },
  { header: 'pricePerLb',        value: (p) => fmtMoney(p.pricePerLb) },
  { header: 'estimatedWeightLb', value: (p) => fmtNum(p.estimatedWeightLb) },
  { header: 'averageWeightLb',   value: (p) => fmtNum(p.averageWeightLb) },
  { header: 'minWeightLb',       value: (p) => fmtNum(p.minWeightLb) },
  { header: 'maxWeightLb',       value: (p) => fmtNum(p.maxWeightLb) },
  { header: 'unitPrice',         value: (p) => fmtMoney(p.unitPrice) },
  { header: 'bundlePrice',       value: (p) => fmtMoney(p.bundlePrice) },
  // includedItems uses the pipe separator the import coercer already
  // expects — round-trip via the import endpoint is symmetrical.
  { header: 'includedItems',     value: (p) => (p.includedItems ?? []).join('|') },
  { header: 'stock',             value: (p) => p.stockCount },
  { header: 'sku',               value: (p) => p.sku ?? '' },
  { header: 'gradeBreed',        value: (p) => p.gradeBreed ?? '' },
  { header: 'supplier',          value: (p) => p.supplier ?? '' },
  { header: 'parLevel',          value: (p) => fmtNum(p.parLevel) },
  { header: 'reorderPoint',      value: (p) => fmtNum(p.reorderPoint) },
  { header: 'isFeatured',        value: (p) => fmtBool(p.isFeatured) },
  { header: 'isActive',          value: (p) => fmtBool(p.isActive) },
  { header: 'isAged',            value: (p) => fmtBool(p.isAged) },
  { header: 'isNewArrival',      value: (p) => fmtBool(p.isNewArrival) },
];

export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);

    // Template mode returns just the header row so admins know the expected
    // column order before they fill anything in.
    if (url.searchParams.get('template') === 'true') {
      const csv = toCsv<Product>([], EXPORT_COLUMNS);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${csvFilename('products-template')}"`,
        },
      });
    }

    const status = parseProductStatus(url.searchParams.get('status'));
    const category = url.searchParams.get('category')?.trim() ?? '';
    const search = url.searchParams.get('search')?.trim() ?? '';
    const sortMode = parseProductSortMode(url.searchParams.get('sort'));

    const query: Record<string, unknown> = {};
    if (category && (PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
      query.category = category;
    }
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [{ name: new RegExp(safe, 'i') }, { category: new RegExp(safe, 'i') }];
    }

    // Map the shared sort union onto Mongo sort. Every member of
    // ProductSortMode has an entry, so this never falls through to {}.
    const sortMap: Record<ProductSortMode, Record<string, 1 | -1>> = {
      newest:       { createdAt: -1 },
      oldest:       { createdAt: 1 },
      'price-asc':  { price: 1 },
      'price-desc': { price: -1 },
      'name-asc':   { name: 1 },
      'top-rated':  { rating: -1 },
    };

    const rawProducts = (await ProductModel.find(query)
      .sort(sortMap[sortMode])
      .limit(10000)
      .lean()
      .exec()) as unknown as Product[];

    const filtered = rawProducts.filter((p) => matchesProductStatus(p, status));

    const csv = toCsv(filtered, EXPORT_COLUMNS);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('products')}"`,
      },
    });
  } catch (error) {
    console.error('[products export GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
