'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';

import { resolveAvatarColor } from '@/lib/admin/constants';
import { formatShopAddress, formatPhoneHref } from '@/lib/shop-settings/format';
import { formatCartCount } from '@/lib/cart/counts';
import { FOCUS_RING_DARK } from '@/lib/styles';
import { useCartContext } from '@/context/CartContext';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useRewardsStanding } from '@/hooks/useRewardsStanding';
import { useScrollLock } from '@/hooks/useScrollLock';
import XIcon from '@/components/ui/icons/XIcon';
import { PRIMARY_LINKS, isActive } from './links';

const fmt = (n: number) => n.toLocaleString('en-US');

// 1px of tolerance — sub-pixel layout can leave a region that is scrolled to
// the bottom reporting a fraction of a pixel short.
const canScrollFurther = (el: HTMLElement) =>
  el.scrollHeight - el.scrollTop - el.clientHeight > 1;

type MobileMenuProps = {
  isOpen: boolean;
  closeMobileMenu: () => void;
  onSignOut: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  name: string;
  email: string;
  initials: string;
  userId: string;
  rewardPoints: number;
  pathname: string;
  /** `getPickupNote().timing`, resolved on the server — see `pickup-note.ts`. */
  pickupTiming: string;
};

type Row = {
  key: string;
  label: string;
  href: string;
  meta: string | null;
  active: boolean;
};

const SectionLabel = ({ children }: { children: string }) => (
  // cream/45 measured 4.03:1 on ink — under the floor. 60 clears it.
  <p className='px-5 pb-2 font-display text-[13.5px] italic text-cream/60'>
    {children}
  </p>
);

const NavRow = ({ row, onNavigate }: { row: Row; onNavigate: () => void }) => (
  <li>
    <Link
      href={row.href}
      onClick={onNavigate}
      aria-current={row.active ? 'page' : undefined}
      className={`relative flex min-h-14.5 items-center gap-3 px-5 transition-colors motion-reduce:transition-none ${FOCUS_RING_DARK} focus-visible:-outline-offset-2 ${
        row.active ? 'bg-camel/7' : 'hover:bg-cream/5'
      }`}
    >
      {/* Oxblood rail on the active row. Colour alone isn't the signal —
          `aria-current` carries it for assistive tech, and the label brightens
          and gains weight alongside. `oxblood` itself measures 2.56:1 against
          the sheet, under the 3:1 that a state indicator wants on its own;
          `oxblood-bright` is the lifted shade for exactly this surface. */}
      <span
        aria-hidden
        className={`absolute top-2.75 bottom-2.75 left-0 w-0.75 rounded-r-sm ${
          row.active ? 'bg-oxblood-bright' : 'bg-transparent'
        }`}
      />
      <span
        className={`min-w-0 flex-1 truncate font-display text-[23px] tracking-[-0.01em] ${
          row.active ? 'font-medium text-cream' : 'text-cream/85'
        }`}
      >
        {row.label}
      </span>
      {row.meta && (
        <span className='shrink-0 text-[12px] text-camel'>{row.meta}</span>
      )}
    </Link>
  </li>
);

const MobileMenu = ({
  isOpen,
  closeMobileMenu,
  onSignOut,
  isAdmin,
  isLoggedIn,
  name,
  email,
  initials,
  userId,
  rewardPoints,
  pathname,
  pickupTiming,
}: MobileMenuProps) => {
  const mounted = useIsMounted();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const settings = useShopSettings();
  const { cartItems } = useCartContext();

  // Only subscribe once the sheet has actually been opened. It is mounted on
  // every page at every viewport so it can slide rather than blink, and it is
  // `lg:hidden` — without this latch every signed-in desktop page load would
  // request a standing that nobody can see. A latch rather than plain `isOpen`
  // so the meta stays resolved across a close and reopen.
  const [hasOpened, setHasOpened] = useState(false);
  if (isOpen && !hasOpened) setHasOpened(true);
  const { standing } = useRewardsStanding(
    hasOpened && isLoggedIn && userId ? userId : null,
  );

  // Does the row list continue past the fold? Sign out sits at the bottom of
  // the scrolling region and on a 667px-tall phone it starts ~170px below it,
  // with an opaque footer beneath — so the list reads as finished when it
  // isn't. This drives a fade over the bottom edge that says otherwise.
  //
  // Measured from a callback ref rather than an effect: the sheet never
  // unmounts, so there is no mount to hang a re-measure on, and setState inside
  // an effect fails this project's lint gate. The observer covers both axes —
  // the scroller's own height (rotation, browser chrome) and its content's
  // (resolving a session adds up to four rows).
  const [moreBelow, setMoreBelow] = useState(false);
  const attachScroller = useCallback((node: HTMLDivElement | null) => {
    const content = node?.firstElementChild;
    if (!node || !content) return;
    const measure = () => setMoreBelow(canScrollFurther(node));
    const observer = new ResizeObserver(measure);
    // Observing fires the callback once, which covers the first measurement.
    observer.observe(node);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // A sheet over a scrim is a real modal, unlike the inline panel this
  // replaced — so it gets the full treatment rather than the two-thirds the
  // old one had (scroll lock and Escape, but no trap and no dialog role).
  // All three live here rather than in `Navbar`, which used to own the other
  // two: one dialog's behaviour belongs in one file, and registering Escape in
  // both would have put two handlers on the shared stack for one sheet.
  // Focus lands on the close button, the one control present in every state.
  useFocusTrap(isOpen, sheetRef, { initialFocusRef: closeBtnRef });
  useScrollLock(isOpen);
  useDismissOnEscape(isOpen, closeMobileMenu);

  if (!mounted) return null;

  // Standing, not the spendable balance — the same figure the desktop account
  // menu and the account page's TierCard show. At the top tier there is no
  // next threshold to count toward, so the tier itself is the standing.
  const rewardsMeta = standing
    ? standing.tier.nextThreshold === null
      ? standing.tier.label
      : `${fmt(standing.qualifying)} / ${fmt(standing.tier.nextThreshold)} pts`
    : null;

  const browseRows: Row[] = [
    ...PRIMARY_LINKS.map((link) => ({
      key: link.href,
      label: link.label,
      href: link.href,
      meta: link.href === '/rewards' ? rewardsMeta : null,
      active: isActive(pathname, link.href),
    })),
    // Logged-out only: a signed-in visitor has no use for the demo door.
    ...(isLoggedIn
      ? []
      : [
          {
            key: 'demo',
            label: 'Demo',
            href: '/demo',
            meta: null,
            active: isActive(pathname, '/demo'),
          },
        ]),
  ];

  // The two account-dashboard rows are deliberately never marked current.
  // Its sections are query params (`?tab=orders`), and `usePathname()` cannot
  // see a query — so on any `/profile` URL both rows resolve identically and
  // marking either would be a guess. An earlier version tried to special-case
  // this and in fact marked *both* on every profile page. The desktop account
  // menu marks none of its rows for the same reason.
  const accountRows: Row[] = isLoggedIn
    ? [
        {
          key: 'cart',
          label: 'Cart',
          href: '/cart',
          // Count only. The cart's own summary calls this an *estimated* total
          // whenever a per-pound cut is in it, so a flat figure here would
          // assert a precision the cart itself refuses.
          meta: cartItems.length > 0 ? formatCartCount(cartItems) : null,
          active: isActive(pathname, '/cart'),
        },
        {
          key: 'orders',
          label: 'Orders',
          href: '/profile?tab=orders',
          meta: null,
          active: false,
        },
        // Labelled for where it lands. `/profile` is the dashboard's Overview
        // section; "Account" is a different section at `?tab=account`, and the
        // desktop menu uses both names that way.
        {
          key: 'overview',
          label: 'Overview',
          href: '/profile',
          meta: null,
          active: false,
        },
        ...(isAdmin
          ? [
              {
                key: 'admin',
                label: 'Admin',
                href: '/dashboard',
                meta: null,
                active: isActive(pathname, '/dashboard'),
              },
            ]
          : []),
      ]
    : [];

  const avatarColor = resolveAvatarColor(userId, isAdmin, rewardPoints);
  const address = formatShopAddress(settings);

  return createPortal(
    <>
      <div
        aria-hidden={!isOpen}
        onClick={closeMobileMenu}
        className={`fixed inset-0 z-100 bg-ink/55 backdrop-blur-xs transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        ref={sheetRef}
        // The trigger's `aria-controls` points here. Portalled to `body`, which
        // `aria-controls` doesn't mind — it resolves by id, not by ancestry.
        id='mobile-menu'
        role='dialog'
        aria-label='Site navigation'
        aria-modal={isOpen || undefined}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 z-101 flex w-[85%] max-w-81.5 flex-col bg-ink text-cream shadow-[-26px_0_60px_-20px_rgba(10,7,5,0.75)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className='flex shrink-0 items-center justify-between border-b border-cream/9 px-4.5 py-3.5'>
          <span className='font-display text-[20px] text-cream'>
            Elite<em className='italic'>Cuts</em>
          </span>
          <button
            ref={closeBtnRef}
            type='button'
            onClick={closeMobileMenu}
            aria-label='Close navigation'
            className={`-mr-2.75 grid size-11 place-items-center rounded-sm text-cream/60 transition-colors hover:text-cream motion-reduce:transition-none ${FOCUS_RING_DARK}`}
          >
            <XIcon className='h-4.25 w-4.25' />
          </button>
        </div>

        {/* `min-h-0` so the scroller actually scrolls: a flex child defaults to
            min-height auto and would grow to fit its content instead. */}
        <div className='relative flex min-h-0 flex-1 flex-col'>
          <div
            ref={attachScroller}
            onScroll={(e) => setMoreBelow(canScrollFurther(e.currentTarget))}
            className='flex-1 overflow-y-auto'
          >
            <div className='py-4'>
              {isLoggedIn && (
                <div className='mb-4 flex items-center gap-3 px-5'>
                  <div
                    aria-hidden
                    className={`grid size-10.5 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${avatarColor}`}
                  >
                    {initials}
                  </div>
                  {/* The email is the only answer to "whose account is this" on
                      a demo account every visitor shares — same reasoning as
                      the desktop panel and the account dashboard. */}
                  <div className='min-w-0'>
                    <p className='truncate font-display text-[18px] leading-tight'>
                      {name}
                    </p>
                    {email && (
                      <p className='mt-0.5 truncate text-[12.5px] text-cream/55'>
                        {email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <SectionLabel>Browse</SectionLabel>
              {/* Named so a screen reader jumping by list can tell the two
                  apart — they are otherwise both "list, N items". */}
              <ul aria-label='Browse'>
                {browseRows.map((row) => (
                  <NavRow key={row.key} row={row} onNavigate={closeMobileMenu} />
                ))}
              </ul>

              {isLoggedIn ? (
                <>
                  <div className='mx-5 my-4 h-px bg-cream/9' />
                  <SectionLabel>Your account</SectionLabel>
                  <ul aria-label='Your account'>
                    {accountRows.map((row) => (
                      <NavRow
                        key={row.key}
                        row={row}
                        onNavigate={closeMobileMenu}
                      />
                    ))}
                  </ul>
                  {/* The design has no sign-out anywhere. Leaving it out would
                      strand every mobile visitor — the same defect the admin
                      nav pass found on its own surface. */}
                  <div className='mt-5 px-5'>
                    <button
                      type='button'
                      onClick={() => {
                        closeMobileMenu();
                        onSignOut();
                      }}
                      className={`flex h-11.5 w-full items-center justify-center rounded-full border border-cream/22 text-[14.5px] font-medium text-cream/85 transition-colors hover:border-oxblood-bright hover:text-oxblood-bright motion-reduce:transition-none ${FOCUS_RING_DARK}`}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className='mt-5 flex gap-2.5 px-5'>
                  <Link
                    href='/login'
                    onClick={closeMobileMenu}
                    className={`flex h-11.5 flex-1 items-center justify-center rounded-full border border-cream/22 text-[14.5px] font-medium text-cream/85 transition-colors hover:text-cream motion-reduce:transition-none ${FOCUS_RING_DARK}`}
                  >
                    Sign in
                  </Link>
                  <Link
                    href='/register'
                    onClick={closeMobileMenu}
                    className={`flex h-11.5 flex-1 items-center justify-center rounded-full bg-oxblood text-[14.5px] font-medium text-cream transition-colors hover:bg-oxblood-deep motion-reduce:transition-none ${FOCUS_RING_DARK}`}
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Fades the last visible row into the sheet so the list reads as
              continuing rather than ending. Only while there is more below, so
              a short signed-out list doesn't get a hint that leads nowhere. */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-ink to-transparent transition-opacity duration-200 motion-reduce:transition-none ${
              moreBelow ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* Both lines are live: the timing comes from the shop's real hours and
            lead time (and says so honestly once the cutoff has passed), the
            address from settings. No open/closed status dot — that needs the
            hours themselves on the client, which they aren't.

            The safe-area inset keeps the phone link clear of the home-indicator
            gesture strip on notched phones, matching the cart drawer's footer
            and the admin bottom nav. */}
        <div className='shrink-0 border-t border-cream/9 bg-ink-soft px-5 pt-3.5 pb-[calc(--spacing(5)+env(safe-area-inset-bottom))]'>
          <p className='font-display text-[16.5px] text-cream/85'>
            {pickupTiming}
          </p>
          {/* cream/50 measured 4.32:1 against `ink-soft`, which is lighter than
              `ink` and eats the margin the same value has elsewhere. */}
          <p className='mt-1.5 text-[12.5px] text-cream/65'>
            {address} ·{' '}
            <a
              href={formatPhoneHref(settings.phone)}
              // Vertical padding on the inline link only grows its hit area —
              // it can't shift the line box — lifting a 17px line to a
              // comfortable target without disturbing the sentence.
              className={`rounded-sm py-1.5 underline underline-offset-2 hover:text-cream ${FOCUS_RING_DARK}`}
            >
              {settings.phone}
            </a>
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default MobileMenu;
