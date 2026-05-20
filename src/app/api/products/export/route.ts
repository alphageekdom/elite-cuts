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

export const dynamic = 'force-dynamic';

// Fixed column order — the import endpoint expects the same headers in the
// same positions. Update both files together if columns change. Legacy docs
// that pre-date the slug field get a slug derived on the fly so the round-
// trip still works; the pre-validate hook will persist that slug the next
// time the doc is saved.
const EXPORT_COLUMNS: { header: string; value: (p: Product) => unknown }[] = [
  { header: 'slug',        value: (p) => p.slug || slugify(p.name) },
  { header: 'name',        value: (p) => p.name },
  { header: 'description', value: (p) => p.description },
  { header: 'category',    value: (p) => p.category },
  // Price is stored as dollars (not cents) on this project's Product model,
  // so no conversion is needed. Two decimals for human readability.
  { header: 'price',       value: (p) => p.price.toFixed(2) },
  { header: 'unit',        value: (p) => p.unit ?? 'lb' },
  { header: 'stock',       value: (p) => p.stockCount },
  { header: 'isFeatured',  value: (p) => (p.isFeatured ? 'true' : 'false') },
  { header: 'isActive',    value: (p) => (p.isActive ? 'true' : 'false') },
  { header: 'supplier',    value: (p) => p.supplier ?? '' },
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
