import { NextResponse } from 'next/server';

import ProductModel, { type Product } from '@/models/Product';
import { withAdmin } from '@/lib/api-handler';
import { toCsv, csvFilename } from '@/lib/csv';
import { CATEGORY_PAR, DEFAULT_PAR, getStockState } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

type StatusFilter = 'all' | 'in-stock' | 'low-stock' | 'critical' | 'out-of-stock';

function parseStatus(raw: string | null): StatusFilter {
  switch (raw) {
    case 'in-stock':
    case 'low-stock':
    case 'critical':
    case 'out-of-stock':
      return raw;
    default:
      return 'all';
  }
}

function matchesStatus(p: Pick<Product, 'stockCount' | 'category'>, status: StatusFilter): boolean {
  if (status === 'all') return true;
  const par = CATEGORY_PAR[p.category] ?? DEFAULT_PAR;
  const state = getStockState(p.stockCount, par);
  if (status === 'out-of-stock') return state === 'out';
  if (status === 'critical') return state === 'critical';
  if (status === 'low-stock') return state === 'low';
  // in-stock covers the healthy + over branches
  return state === 'healthy' || state === 'over';
}

export const GET = withAdmin(async (req) => {
  try {
    const url = new URL(req.url);
    const status = parseStatus(url.searchParams.get('status'));
    const category = url.searchParams.get('category')?.trim() ?? '';
    const search = url.searchParams.get('search')?.trim() ?? '';

    const query: Record<string, unknown> = { isActive: { $ne: false } };
    if (category) query.category = category;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(safe, 'i');
      query.$or = [{ name: rx }, { sku: rx }, { supplier: rx }];
    }

    const rawProducts = await ProductModel.find(query)
      .sort({ category: 1, name: 1 })
      .limit(10000)
      .lean()
      .exec();

    const filtered = rawProducts.filter((p) => matchesStatus(p, status));

    const csv = toCsv(filtered, [
      { header: 'SKU', value: (p) => p.sku ?? '' },
      { header: 'Name', value: (p) => p.name },
      { header: 'Category', value: (p) => p.category },
      { header: 'Stock', value: (p) => p.stockCount },
      { header: 'Par level', value: (p) => p.parLevel ?? CATEGORY_PAR[p.category] ?? DEFAULT_PAR },
      { header: 'Active', value: (p) => (p.isActive ? 'true' : 'false') },
      { header: 'Featured', value: (p) => (p.isFeatured ? 'true' : 'false') },
      { header: 'Supplier', value: (p) => p.supplier ?? '' },
      { header: 'Last updated', value: (p) => p.updatedAt.toISOString() },
    ]);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFilename('inventory')}"`,
      },
    });
  } catch (error) {
    console.error('[inventory export GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
