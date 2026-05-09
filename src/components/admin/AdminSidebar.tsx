import { getSessionUser } from '@/utils/getSessionUser';
import { fetchNavBadges } from '@/lib/nav-data';
import AdminSidebarClient from './AdminSidebarClient';

export default async function AdminSidebar() {
  const sessionUser = await getSessionUser();
  const name = sessionUser?.user?.name ?? 'Admin';
  const initial = name.charAt(0).toUpperCase();

  const { criticalInventoryCount, openMessageCount } = await fetchNavBadges();

  return (
    <AdminSidebarClient
      name={name}
      initial={initial}
      criticalInventoryCount={criticalInventoryCount}
      openMessageCount={openMessageCount}
    />
  );
}
