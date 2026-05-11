import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import MessageModel from '@/models/Message';
import { CATEGORY_PAR, DEFAULT_PAR } from '@/lib/inventory';

export type NavBadges = {
  criticalInventoryCount: number;
  openMessageCount: number;
};

export async function fetchNavBadges(): Promise<NavBadges> {
  let criticalInventoryCount = 0;
  let openMessageCount = 0;
  try {
    await connectDB();
    const [products, msgCount] = await Promise.all([
      ProductModel.find({ isArchived: { $ne: true } }).select('category stockCount').lean().exec(),
      MessageModel.countDocuments({ status: 'open' }),
    ]);
    for (const p of products) {
      const par = CATEGORY_PAR[p.category] ?? DEFAULT_PAR;
      if (p.stockCount / par < 0.3) criticalInventoryCount++;
    }
    openMessageCount = msgCount;
  } catch {
    // Non-fatal — badges just won't show
  }
  return { criticalInventoryCount, openMessageCount };
}
