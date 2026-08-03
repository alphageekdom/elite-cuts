import type { ReactNode } from 'react';

import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';
import { getActiveAnnouncements } from '@/lib/announcements/data';
import { getPickupNoteNow } from '@/lib/shop-settings/pickup-note';

/**
 * The navbar + main + footer scaffold both route groups render.
 *
 * `(main)` and `(auth)` had drifted into byte-identical copies of this, differing
 * only by the exported function's name and one padding value — so every change
 * to the shell had to be made twice, and the mobile-nav branch is the evidence
 * that this actually happened: the same three-line edit landed in both files.
 *
 * `mainClassName` is the one real difference and stays a prop rather than being
 * unified away. `(main)` includes `/`, where the navbar renders taller, so the
 * `pt-20` / `pt-16` split is deliberate — collapsing it would tuck content under
 * the navbar on the home page.
 */
export default async function SiteShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName: string;
}) {
  const [announcements, pickup] = await Promise.all([
    getActiveAnnouncements(),
    getPickupNoteNow(),
  ]);

  return (
    <>
      <Navbar announcements={announcements} pickupTiming={pickup.timing} />
      <main className={mainClassName}>{children}</main>
      <Footer />
    </>
  );
}
