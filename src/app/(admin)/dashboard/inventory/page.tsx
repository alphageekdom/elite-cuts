import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import AgingCutModel from '@/models/AgingCut';
import DeliveryModel from '@/models/Delivery';

import InventoryPageHeader from '@/components/admin/inventory/InventoryPageHeader';
import InventoryClient, {
  type InventoryRow,
  type InventoryCounts,
} from '@/components/admin/inventory/InventoryClient';
import type { AgingCutRow } from '@/components/admin/inventory/InventoryAgingRoom';
import type { DeliveryRow } from '@/components/admin/inventory/InventoryUpcomingDeliveries';
import { CATEGORY_PAR, DEFAULT_PAR } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inventory · EliteCuts Admin',
};

export default async function AdminInventoryPage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.user?.isAdmin) {
    redirect('/login');
  }

  await connectDB();

  const [rawProducts, rawAgingCuts, rawDeliveries] = await Promise.all([
    ProductModel.find({ isActive: { $ne: false } }).sort({ stockCount: 1 }).limit(200).lean().exec(),
    AgingCutModel.find({}).sort({ startedAt: 1 }).lean().exec(),
    DeliveryModel.find({ deliveryDate: { $gte: new Date() } }).sort({ deliveryDate: 1 }).limit(50).lean().exec(),
  ]);

  const total = rawProducts.length;

  let inStock = 0;
  let lowStock = 0;
  let critical = 0;

  for (const p of rawProducts) {
    if (p.stockCount === 0) continue;
    const par = CATEGORY_PAR[p.category] ?? DEFAULT_PAR;
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
    agingRoom: rawAgingCuts.length,
  };

  const categoryCounts: Record<string, number> = {};
  for (const p of rawProducts) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
  }

  // productId → earliest upcoming delivery status
  const deliveryStatusMap = new Map<string, string>();
  // productId → current stock count (for pre-filling the received qty input)
  const productStockMap = new Map<string, number>(
    rawProducts.map((p) => [p._id.toString(), p.stockCount]),
  );
  // productId → par level (for the status preview after receiving)
  const productParMap = new Map<string, number>(
    rawProducts.map((p) => [p._id.toString(), CATEGORY_PAR[p.category] ?? DEFAULT_PAR]),
  );

  for (const d of rawDeliveries) {
    if (d.productId) {
      const pid = d.productId.toString();
      if (!deliveryStatusMap.has(pid)) {
        deliveryStatusMap.set(pid, d.status);
      }
    }
  }

  const rows: InventoryRow[] = rawProducts.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    category: p.category,
    price: p.price,
    images: p.images,
    stockCount: p.stockCount,
    isAged: p.isAged,
    supplier: p.supplier ?? '',
    createdAt: p.createdAt.toISOString(),
    deliveryStatus: (deliveryStatusMap.get(p._id.toString()) ?? null) as string | null,
  }));

  const agingCuts: AgingCutRow[] = rawAgingCuts.map((c) => ({
    _id: c._id.toString(),
    cut: c.cut,
    targetDays: c.targetDays,
    rack: c.rack,
    weightLb: c.weightLb,
    startedAt: c.startedAt.toISOString(),
    isActive: c.isActive,
  }));

  const deliveries: DeliveryRow[] = rawDeliveries.map((d) => ({
      _id: d._id.toString(),
      deliveryDate: d.deliveryDate.toISOString(),
      supplier: d.supplier,
      supplierSuffix: d.supplierSuffix,
      detail: d.detail,
      status: d.status,
      productId: d.productId?.toString() ?? null,
      currentStock: d.productId ? (productStockMap.get(d.productId.toString()) ?? null) : null,
      parLevel: d.productId ? (productParMap.get(d.productId.toString()) ?? null) : null,
    }));

  return (
    <>
      <InventoryPageHeader totalProducts={total} />
      <InventoryClient
        rows={rows}
        counts={counts}
        categoryCounts={categoryCounts}
        agingCuts={agingCuts}
        deliveries={deliveries}
      />
    </>
  );
}
