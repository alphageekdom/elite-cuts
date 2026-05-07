import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import ProductModel from '@/models/Product';

import InventoryPageHeader from '@/components/admin/inventory/InventoryPageHeader';
import InventoryClient, {
  type InventoryRow,
  type InventoryCounts,
} from '@/components/admin/inventory/InventoryClient';
import { CATEGORY_PAR } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Inventory · EliteCuts Admin',
};

const AGING_ROOM_COUNT = 8;

export default async function AdminInventoryPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const rawProducts = await ProductModel.find({})
    .sort({ stockCount: 1 })
    .limit(200)
    .lean()
    .exec();

  const total = rawProducts.length;

  let inStock = 0;
  let lowStock = 0;
  let critical = 0;

  for (const p of rawProducts) {
    if (p.stockCount === 0) continue;
    const par = CATEGORY_PAR[p.category] ?? 15;
    const ratio = p.stockCount / par;
    if (ratio < 0.3) {
      critical++;
    } else if (ratio < 0.7) {
      lowStock++;
    } else {
      inStock++;
    }
  }

  const counts: InventoryCounts = {
    all: total,
    inStock,
    lowStock,
    critical,
    agingRoom: AGING_ROOM_COUNT,
  };

  const categoryCounts: Record<string, number> = {};
  for (const p of rawProducts) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  const rows: InventoryRow[] = rawProducts.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    category: p.category,
    price: p.price,
    images: p.images,
    stockCount: p.stockCount,
    isAged: p.isAged,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <>
      <InventoryPageHeader totalProducts={total} />
      <InventoryClient
        rows={rows}
        counts={counts}
        categoryCounts={categoryCounts}
      />
    </>
  );
}
