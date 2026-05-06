import type { ReactNode } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <AdminTopbar />
        <main className="flex-1 w-full max-w-350 px-5 py-6 pb-16 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
