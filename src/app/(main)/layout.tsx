import type { ReactNode } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { getActiveAnnouncements } from '@/lib/announcements/data';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const announcements = await getActiveAnnouncements();
  return (
    <>
      <Navbar announcements={announcements} />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
