'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GiMeatCleaver } from 'react-icons/gi';
import { MOBILE_PRIMARY, MOBILE_MORE } from './navItems';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import XIcon from '@/components/uielements/XIcon';

type Props = {
  criticalInventoryCount: number;
  openMessageCount?: number;
};

const MoreIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
  </svg>
);

const HomeIcon = ({ className = 'w-5 h-5 shrink-0' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2z" />
  </svg>
);

// Cream-ringed dot reads as an alert against the dark ink bar — matches
// the tablet rail and the topbar bell.
const Badge = () => (
  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-oxblood border border-cream/30" />
);

export default function AdminMobileBottomNav({ criticalInventoryCount, openMessageCount = 0 }: Props) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const hasBadge = (href: string) =>
    (href === '/dashboard/inventory' && criticalInventoryCount > 0) ||
    (href === '/dashboard/messages' && openMessageCount > 0);

  const moreIsActive = MOBILE_MORE.some((item) => isActive(item.href));
  const moreHasBadge = MOBILE_MORE.some((item) => hasBadge(item.href));

  // Close sheet on route change — adjust state while rendering rather than running
  // a setState-in-effect cascade.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (sheetOpen) setSheetOpen(false);
  }

  useDismissOnEscape(sheetOpen, () => setSheetOpen(false));

  // Focus lands on the close button on open, Tab cycles inside the sheet, and
  // focus returns to the "More" trigger on close. Previously only focus-in was
  // wired up — no trap, no restore.
  useFocusTrap(sheetOpen, sheetRef, { initialFocusRef: closeButtonRef });

  // Shared per-tab classes — every tab keeps a 2-px transparent top border so
  // active and inactive tabs are the same height, then the active tab swaps
  // the border to oxblood for a clear "you are here" chip. `-mt-px` pulls
  // the tab up 1px so the new border overlaps the nav's parent border.
  const tabBase =
    'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 border-t-2 -mt-px transition-colors';
  const tabActive = 'border-oxblood text-oxblood';
  const tabInactive = 'border-transparent text-cream/70 hover:text-cream';

  return (
    <>
      {/* Bottom Nav — the safe-area-inset-bottom padding lifts the bar above
          the iPhone home indicator so it doesn't sit in the gesture zone on
          notched devices. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-stretch bg-ink border-t border-cream/15 pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile navigation"
      >
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`${tabBase} ${active ? tabActive : tabInactive}`}
            >
              <span className="relative">
                <item.Icon className="w-5 h-5 shrink-0" />
                {hasBadge(item.href) && <Badge />}
              </span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          aria-label="More navigation options"
          className={`${tabBase} ${moreIsActive ? tabActive : tabInactive}`}
        >
          <span className="relative">
            <MoreIcon />
            {moreHasBadge && <Badge />}
          </span>
          <span className="text-[11px] font-medium">More</span>
        </button>
      </nav>

      {/* More Sheet — overlay + panel */}
      {sheetOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-ink/60 md:hidden"
            onClick={() => setSheetOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet — capped at viewport height with internal scroll as a
              safety net. In landscape the link list flips to a 2-col grid
              with tighter padding so the X close button stays above the
              fold on iPhone SE (375px landscape height). */}
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col bg-ink rounded-t-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] max-h-screen"
          >
            {/* Header — overlay tap and the X button cover dismissal, so no
                decorative drag handle (it implied swipe-to-close that wasn't
                wired up). */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 landscape:pt-3 landscape:pb-2">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-oxblood grid place-items-center shrink-0">
                  <GiMeatCleaver className="text-sm text-cream" aria-hidden="true" />
                </span>
                <span className="font-display text-[15px] font-semibold text-cream tracking-tight">
                  More
                </span>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setSheetOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 rounded-full grid place-items-center text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-cream/15 mx-5 shrink-0" />

            {/* Body scrolls if content ever overflows the capped sheet. */}
            <div className="overflow-y-auto">
              {/* Hop back to the customer-facing site — visually distinct
                  from the admin sections below since it's a context switch,
                  not navigation within admin. */}
              <Link
                href="/"
                className="flex items-center gap-3.5 mx-4 mt-3 mb-2 px-4 py-3 rounded-xl min-h-12 text-cream/75 hover:bg-cream/8 hover:text-cream transition-colors landscape:py-2 landscape:min-h-11"
              >
                <HomeIcon className="w-5 h-5 shrink-0 opacity-85" />
                <span className="text-[15px] font-medium">Homepage</span>
              </Link>

              <div className="h-px bg-cream/15 mx-5" />

              {/* Admin sections — 1 col portrait, 2 col landscape. */}
              <nav
                className="px-4 py-3 pb-8 grid grid-cols-1 gap-1 landscape:grid-cols-2 landscape:gap-x-2 landscape:gap-y-1 landscape:pb-4"
                aria-label="Secondary navigation"
              >
                {MOBILE_MORE.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex items-center gap-3.5 px-4 py-3.5 rounded-xl min-h-13 transition-colors landscape:py-2 landscape:min-h-11 landscape:px-3.5',
                        active ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
                      ].join(' ')}
                    >
                      <span className="relative opacity-85 shrink-0">
                        <item.Icon className="w-5 h-5 shrink-0" />
                        {hasBadge(item.href) && <Badge />}
                      </span>
                      <span className="text-[15px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
