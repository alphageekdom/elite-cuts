import Link from 'next/link';
import { GiMeatCleaver } from 'react-icons/gi';
import { getSessionUser } from '@/utils/getSessionUser';
import connectDB from '@/config/database';
import ProductModel from '@/models/Product';
import { CATEGORY_PAR } from '@/lib/inventory';
import AdminNavLinks from './AdminNavLinks';

export default async function AdminSidebar() {
  const sessionUser = await getSessionUser();
  const name = sessionUser?.user?.name ?? 'Admin';
  const initial = name.charAt(0).toUpperCase();

  let criticalInventoryCount = 0;
  try {
    await connectDB();
    const products = await ProductModel.find({ stockCount: { $gt: 0 } })
      .select('category stockCount')
      .lean()
      .exec();
    for (const p of products) {
      const par = CATEGORY_PAR[p.category] ?? 15;
      if (p.stockCount / par < 0.3) criticalInventoryCount++;
    }
  } catch {
    // Non-fatal — badge just won't show
  }

  return (
    <aside className="hidden md:flex w-60 bg-ink text-cream flex-col py-7 px-6 sticky top-0 h-screen shrink-0">
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 font-display text-[22px] font-semibold tracking-tight text-cream mb-2 hover:opacity-90 transition-opacity"
      >
        <span className="w-9 h-9 rounded-full bg-oxblood grid place-items-center shrink-0">
          <GiMeatCleaver className="text-xl text-cream" aria-hidden="true" />
        </span>
        EliteCuts
      </Link>
      <div className="text-[10px] tracking-[0.22em] uppercase text-camel ml-12 mb-10">
        Admin · v2.4
      </div>

      <AdminNavLinks criticalInventoryCount={criticalInventoryCount} />

      {/* User card */}
      <div className="mt-auto pt-6 border-t border-cream/8">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-cream/5 transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-cream truncate">{name}</div>
            <div className="text-[11px] text-cream/55 tracking-[0.06em] uppercase">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
