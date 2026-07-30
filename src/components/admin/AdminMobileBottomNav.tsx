'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_PRIMARY, MOBILE_MORE } from './navItems';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAdminSignOut } from '@/hooks/useAdminSignOut';
import XIcon from '@/components/uielements/XIcon';
import SignOutIcon from '@/components/uielements/SignOutIcon';

type Props = {
  name: string;
  initial: string;
  criticalInventoryCount: number;
  openMessageCount?: number;
};

const MORE_GROUPS = [
  { key: 'workspace', title: 'Workspace' },
  { key: 'operations', title: 'Operations' },
] as const;

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

export default function AdminMobileBottomNav({ name, initial, criticalInventoryCount, openMessageCount = 0 }: Props) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { handleSignOut, busy: signingOut } = useAdminSignOut();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const badgeCount = (href: string) =>
    href === '/dashboard/inventory' ? criticalInventoryCount
    : href === '/dashboard/messages' ? openMessageCount
    : 0;

  const hasBadge = (href: string) => badgeCount(href) > 0;

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
      {/* Overlay — sits under the bottom stack, so the tab bar stays visible
          and pointer-tappable while the sheet is open. */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/60 md:hidden"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom stack — sheet and tab bar are one fixed, bottom-anchored
          column with the sheet above the bar in normal flow.

          The sheet used to be its own `fixed bottom-0` element at a higher
          z-index, so it covered the bar outright: the More tab went dark
          exactly while its own sheet was open, and reaching another tab meant
          dismissing first. Stacking them, rather than padding the sheet by the
          bar's height, means there is no measurement to keep in sync — the bar
          cannot be covered by construction, whatever either one's height does
          later. `max-h-dvh` on the column plus `min-h-0` on the sheet keeps the
          pair inside the viewport and leaves the scrolling to the sheet body. */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex flex-col max-h-dvh">
        {sheetOpen && (
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            // `scheme-dark scrollbar-ink` so the sheet's scrolling list gets a
            // dark scrollbar tracked in `bg-ink`, matching the sidebar and rail.
            className="scheme-dark scrollbar-ink min-h-0 flex flex-col bg-ink rounded-t-2xl overflow-hidden"
          >
            {/* Header — who is signed in. The cleaver-and-"More" it replaces
                repeated the tab the user just pressed, while mobile had no
                indication of the account at all; desktop has carried one in
                the sidebar since launch.
                Still no drag handle — it implied a swipe-to-close that was
                never wired up, which is why it was removed on 2026-05-22.
                Overlay tap, the close button and Escape all dismiss. */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-4 pb-3 landscape:pt-3 landscape:pb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-sm shrink-0"
                >
                  {initial}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[15px] font-semibold text-cream tracking-tight truncate">
                    {name}
                  </span>
                  <span className="block text-[10px] text-cream/55 tracking-[0.16em] uppercase">
                    Admin
                  </span>
                </span>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setSheetOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 shrink-0 rounded-full grid place-items-center text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-camel"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-cream/15 mx-5 shrink-0" />

            {/* Body scrolls if the content outgrows the capped column. */}
            <div className="overflow-y-auto">
              {/* Grouped the way every other admin nav surface already groups
                  these links. `group` is a field on each nav item, so this
                  reads the existing data rather than a parallel list.
                  1 col portrait, 2 col landscape. */}
              {MORE_GROUPS.map((group) => {
                const items = MOBILE_MORE.filter((i) => i.group === group.key);
                if (items.length === 0) return null;
                return (
                  <nav key={group.key} aria-label={group.title} className="px-4 pt-3">
                    <h2 className="text-[10px] font-medium tracking-[0.22em] uppercase text-cream/60 px-4 pb-2 landscape:pb-1">
                      {group.title}
                    </h2>
                    <div className="grid grid-cols-1 gap-1 landscape:grid-cols-2 landscape:gap-x-2 landscape:gap-y-1">
                      {items.map((item) => {
                        const active = isActive(item.href);
                        const count = badgeCount(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={[
                              'flex items-center gap-3.5 px-4 py-3.5 rounded-xl min-h-13 transition-colors landscape:py-2 landscape:min-h-11 landscape:px-3.5',
                              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-camel',
                              active ? 'bg-oxblood text-cream' : 'text-cream/75 hover:bg-cream/8 hover:text-cream',
                            ].join(' ')}
                          >
                            <span className="opacity-85 shrink-0">
                              <item.Icon className="w-5 h-5 shrink-0" />
                            </span>
                            <span className="text-[15px] font-medium flex-1 min-w-0 truncate">{item.label}</span>
                            {/* A real number here, where the tab bar keeps a
                                bare dot: this row has the width for it, five
                                tabs across a phone do not. */}
                            {count > 0 && (
                              <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-oxblood text-cream text-[11px] font-medium grid place-items-center tabular-nums">
                                {count}
                                {/* "open" is the word the topbar and the whole
                                    messages domain already use for this count. */}
                                <span className="sr-only"> open</span>
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </nav>
                );
              })}

              {/* Leaving admin, and leaving the session. Sign-out existed
                  nowhere in the admin shell before this — an admin had to
                  navigate to the storefront to end their session. */}
              <div className="mt-3 pt-2 px-4 pb-6 border-t border-cream/15 landscape:pb-3">
                <Link
                  href="/"
                  className="flex items-center gap-3.5 px-4 py-3 rounded-xl min-h-12 text-cream/75 hover:bg-cream/8 hover:text-cream transition-colors landscape:py-2 landscape:min-h-11 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-camel"
                >
                  <HomeIcon className="w-5 h-5 shrink-0 opacity-85" />
                  <span className="text-[15px] font-medium">View the storefront</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl min-h-12 text-cream/75 hover:bg-cream/8 hover:text-cream transition-colors landscape:py-2 landscape:min-h-11 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-camel"
                >
                  <SignOutIcon className="w-5 h-5 shrink-0 opacity-85" />
                  <span className="text-[15px] font-medium">
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav — the safe-area-inset-bottom padding lifts the bar above
            the iPhone home indicator so it doesn't sit in the gesture zone on
            notched devices. */}
        <nav
          className="shrink-0 flex items-stretch bg-ink border-t border-cream/15 pb-[env(safe-area-inset-bottom)]"
          aria-label="Mobile navigation"
        >
          {MOBILE_PRIMARY.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                // `aria-current` tracks the route and so stays put while the
                // sheet is open — this is still the current page. Only the
                // visual selection moves, so exactly one tab reads selected:
                // otherwise Dashboard and More both lit up at once and the
                // highlight stopped meaning anything.
                aria-current={active ? 'page' : undefined}
                className={`${tabBase} ${active && !sheetOpen ? tabActive : tabInactive}`}
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
            onClick={() => setSheetOpen((v) => !v)}
            aria-expanded={sheetOpen}
            aria-haspopup="dialog"
            aria-label="More navigation options"
            className={`${tabBase} ${moreIsActive || sheetOpen ? tabActive : tabInactive}`}
          >
            <span className="relative">
              <MoreIcon />
              {moreHasBadge && <Badge />}
            </span>
            <span className="text-[11px] font-medium">More</span>
          </button>
        </nav>
      </div>
    </>
  );
}
