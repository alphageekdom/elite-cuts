import { getSessionUser } from '@/utils/getSessionUser';
import type { NavBadges } from '@/lib/nav-data';
import AdminTabletRail from './AdminTabletRail';
import AdminMobileBottomNav from './AdminMobileBottomNav';

export default async function AdminNavData({ badges }: { badges: NavBadges }) {
  const sessionUser = await getSessionUser();
  const name = sessionUser?.user?.name ?? 'Admin';
  const initial = name.charAt(0).toUpperCase();

  const { criticalInventoryCount, openMessageCount } = badges;

  return (
    <>
      <AdminTabletRail initial={initial} criticalInventoryCount={criticalInventoryCount} openMessageCount={openMessageCount} />
      <AdminMobileBottomNav criticalInventoryCount={criticalInventoryCount} />
    </>
  );
}
