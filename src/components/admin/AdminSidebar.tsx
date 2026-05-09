import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import MessageModel from '@/models/Message';
import { CATEGORY_PAR } from '@/lib/inventory';
import AdminSidebarClient from './AdminSidebarClient';

export default async function AdminSidebar() {
  const sessionUser = await getSessionUser();
  const name = sessionUser?.user?.name ?? 'Admin';
  const initial = name.charAt(0).toUpperCase();

  let criticalInventoryCount = 0;
  let openMessageCount = 0;
  try {
    await connectDB();
    const [products, msgCount] = await Promise.all([
      ProductModel.find({ stockCount: { $gt: 0 } }).select('category stockCount').lean().exec(),
      MessageModel.countDocuments({ status: 'open' }),
    ]);
    for (const p of products) {
      const par = CATEGORY_PAR[p.category] ?? 15;
      if (p.stockCount / par < 0.3) criticalInventoryCount++;
    }
    openMessageCount = msgCount;
  } catch {
    // Non-fatal — badges just won't show
  }

  return (
    <AdminSidebarClient
      name={name}
      initial={initial}
      criticalInventoryCount={criticalInventoryCount}
      openMessageCount={openMessageCount}
    />
  );
}
