import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import MessageModel from '@/models/Message';
import { CATEGORY_PAR, DEFAULT_PAR, getStockState } from '@/lib/inventory';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';

export type NavBadges = {
  criticalInventoryCount: number;
  openMessageCount: number;
};

export async function fetchNavBadges(): Promise<NavBadges> {
  let criticalInventoryCount = 0;
  let openMessageCount = 0;
  try {
    await connectDB();
    // `isArchived` does not exist on Product — soft delete is `isActive:
    // false` — so the old filter was a no-op and the badge counted cuts the
    // inventory tab it links to excludes. `isActive: { $ne: false }` is what
    // that tab actually filters on, and `VISIBLE_PRODUCT_FILTER` carries it.
    const [products, msgCount] = await Promise.all([
      ProductModel.find({ isActive: VISIBLE_PRODUCT_FILTER.isActive })
        .select('category stockCount')
        .lean()
        .exec(),
      MessageModel.countDocuments({ status: 'open' }),
    ]);
    for (const p of products) {
      const par = CATEGORY_PAR[p.category] ?? DEFAULT_PAR;
      // Through the shared classifier rather than an inline ratio: the inline
      // `< 0.3` counted out-of-stock cuts (ratio 0) as critical, while the
      // inventory tab's own strip reads `getStockState`, which classifies
      // those as `out`. The badge and the page it links to disagreed.
      if (getStockState(p.stockCount, par) === 'critical') criticalInventoryCount++;
    }
    openMessageCount = msgCount;
  } catch {
    // Non-fatal — badges just won't show
  }
  return { criticalInventoryCount, openMessageCount };
}
