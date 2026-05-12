import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminNavData from '@/components/admin/AdminNavData';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { getSessionUser } from '@/utils/getSessionUser';
import { fetchNavBadges } from '@/lib/nav-data';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  const badges = await fetchNavBadges();

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar />
      <AdminNavData badges={badges} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <AdminTopbar openMessageCount={badges.openMessageCount} />
        <main className="flex-1 w-full max-w-350 px-5 py-6 pb-24 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
