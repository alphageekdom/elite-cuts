'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GiMeatCleaver } from 'react-icons/gi';
import { MOBILE_PRIMARY, MOBILE_MORE } from './navItems';

type Props = {
  criticalInventoryCount: number;
  openMessageCount?: number;
};

const MoreIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

  // ESC key closes sheet
  useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheetOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sheetOpen]);

  // Focus close button when sheet opens
  useEffect(() => {
    if (sheetOpen) closeButtonRef.current?.focus();
  }, [sheetOpen]);

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

          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-ink rounded-t-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header — overlay tap and the X button cover dismissal, so no
                decorative drag handle (it implied swipe-to-close that wasn't
                wired up). */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
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
                <CloseIcon />
              </button>
            </div>

            <div className="h-px bg-cream/15 mx-5" />

            {/* Links */}
            <nav className="px-4 py-3 pb-8 flex flex-col gap-1" aria-label="Secondary navigation">
              {MOBILE_MORE.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-3.5 px-4 py-3.5 rounded-xl min-h-13 transition-colors',
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
        </>
      )}
    </>
  );
}
