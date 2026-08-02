import type { ReactNode } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { getActiveAnnouncements } from '@/lib/announcements/data';
import { getPickupNoteNow } from '@/lib/shop-settings/pickup-note';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const [announcements, pickup] = await Promise.all([
    getActiveAnnouncements(),
    getPickupNoteNow(),
  ]);
  return (
    <>
      <Navbar announcements={announcements} pickupTiming={pickup.timing} />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}
