import type { ReactNode } from 'react';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/layout/Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
