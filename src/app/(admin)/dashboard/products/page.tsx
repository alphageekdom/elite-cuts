import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/getSessionUser';
import connectDB from '@/config/database';
import ProductModel from '@/models/Product';

import { serializeProductRow } from '@/lib/serializers';
import ProductsClient, { type ProductTableRow, type ProductCounts } from '@/components/admin/products/ProductsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products · EliteCuts Admin',
};

export default async function AdminProductsPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const rawProducts = await ProductModel.find({})
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()
    .exec();

  const total = rawProducts.length;
  const inStock = rawProducts.filter((p) => p.stockCount > 0).length;
  const outOfStock = rawProducts.filter((p) => p.stockCount === 0).length;
  const featured = rawProducts.filter((p) => p.isFeatured).length;
  const avgPrice =
    total > 0 ? rawProducts.reduce((acc, p) => acc + p.price, 0) / total : 0;

  const counts: ProductCounts = {
    all: total,
    inStock,
    outOfStock,
    featured,
    avgPrice,
  };

  const categoryCounts: Record<string, number> = {};
  for (const p of rawProducts) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  const products: ProductTableRow[] = rawProducts.map(serializeProductRow);

  return (
    <ProductsClient
      products={products}
      counts={counts}
      categoryCounts={categoryCounts}
      headerCounts={{ total, inStock, outOfStock }}
    />
  );
}
