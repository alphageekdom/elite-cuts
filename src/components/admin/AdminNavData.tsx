import { getSessionUser } from '@/utils/getSessionUser';
import { fetchNavBadges } from '@/lib/nav-data';
import AdminTabletRail from './AdminTabletRail';
import AdminMobileBottomNav from './AdminMobileBottomNav';

export default async function AdminNavData() {
  const sessionUser = await getSessionUser();
  const name = sessionUser?.user?.name ?? 'Admin';
  const initial = name.charAt(0).toUpperCase();

  const { criticalInventoryCount, openMessageCount } = await fetchNavBadges();

  return (
    <>
      <AdminTabletRail initial={initial} criticalInventoryCount={criticalInventoryCount} openMessageCount={openMessageCount} />
      <AdminMobileBottomNav criticalInventoryCount={criticalInventoryCount} />
    </>
  );
}
