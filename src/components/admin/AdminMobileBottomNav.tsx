'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GiMeatCleaver } from 'react-icons/gi';
import { MOBILE_PRIMARY, MOBILE_MORE } from './navItems';

type Props = {
  criticalInventoryCount: number;
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

export default function AdminMobileBottomNav({ criticalInventoryCount }: Props) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const moreIsActive = MOBILE_MORE.some((item) => isActive(item.href));

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

  return (
    <>
      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-stretch bg-ink border-t border-cream/15"
        aria-label="Mobile navigation"
      >
        {MOBILE_PRIMARY.map((item) => {
          const isInventory = item.href === '/dashboard/inventory';
          const showBadge = isInventory && criticalInventoryCount > 0;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 transition-colors',
                active ? 'text-oxblood' : 'text-cream/55 hover:text-cream',
              ].join(' ')}
            >
              <span className="relative">
                <item.Icon className="w-5 h-5 shrink-0" />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-oxblood border border-ink" />
                )}
              </span>
              <span className="text-[10px] tracking-wide font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          aria-label="More navigation options"
          className={[
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-14 transition-colors',
            moreIsActive ? 'text-oxblood' : 'text-cream/55 hover:text-cream',
          ].join(' ')}
        >
          <MoreIcon />
          <span className="text-[10px] tracking-wide font-medium">More</span>
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
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-ink rounded-t-2xl overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-cream/20" aria-hidden="true" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
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
                className="w-8 h-8 rounded-full grid place-items-center text-cream/55 hover:text-cream hover:bg-cream/10 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="h-px bg-cream/15 mx-5" />

            {/* Links */}
            <nav className="px-4 py-3 pb-8 flex flex-col gap-1" aria-label="Secondary navigation">
              {MOBILE_MORE.map((item) => {
                const isInventory = item.href === '/dashboard/inventory';
                const showBadge = isInventory && criticalInventoryCount > 0;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center gap-3.5 px-4 py-3.5 rounded-xl min-h-[52px] transition-colors',
                      active ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
                    ].join(' ')}
                  >
                    <span className="relative opacity-85 shrink-0">
                      <item.Icon className="w-5 h-5 shrink-0" />
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-oxblood border border-ink" />
                      )}
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
