import type { ReactNode } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/layout/Footer';
import { getActiveAnnouncements } from '@/lib/announcements';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const announcements = await getActiveAnnouncements();
  return (
    <>
      <Navbar announcements={announcements} />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}
