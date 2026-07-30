import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminNavSurfaces from '@/components/admin/AdminNavSurfaces';
import AdminTopbar from '@/components/admin/AdminTopbar';
import { getSessionUser } from '@/lib/auth/session';
import { fetchNavBadges } from '@/lib/admin/nav-data';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Every dashboard page repeats this guard, and that is load-bearing, not
  // redundant: layouts don't re-render on soft navigation, so this check only
  // runs on hard loads. The per-page copies are what actually gate a
  // client-side navigation into a tab. Don't "clean them up."
  const sessionUser = await getSessionUser();
  if (!sessionUser?.user?.isAdmin) redirect('/login');

  const badges = await fetchNavBadges();

  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar />
      <AdminNavSurfaces badges={badges} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <AdminTopbar openMessageCount={badges.openMessageCount} />
        <main className="flex-1 w-full max-w-350 px-5 py-6 pb-24 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
