'use client';

import { useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { resolveAvatarColor } from '@/lib/admin/constants';
import { FOCUS_RING, FOCUS_RING_DARK } from '@/lib/styles';
import { useDismissOnEscape } from '@/hooks/useDismissOnEscape';
import { PROFILE_TABS } from '@/components/profile/dashboard/tabs';
import SignOutIcon from '@/components/ui/icons/SignOutIcon';
import ProfileMenuStanding from './ProfileMenuStanding';

type ProfileMenuProps = {
  profileImage?: string;
  name: string;
  email: string;
  initials: string;
  userId: string;
  isAdmin: boolean;
  rewardPoints: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
};

const ROW_CLASS =
  'flex min-h-10.5 w-full items-center gap-2.75 rounded-sm px-3 text-left text-[14.5px] transition-colors motion-reduce:transition-none';

// Decorative left rail. In the redesign sketch these dots carried an accent
// state — a gold one beside "Your orders · 1 ready" — which is gone along with
// the counts, since nothing in a client navbar knows how many orders are ready
// without a per-page fetch. What they still do is line the nav rows up with the
// sign-out icon in the gutter below, which is why they stayed rather than being
// dropped as pure noise.
const Dot = () => (
  <span aria-hidden className='flex w-3.75 shrink-0 justify-center'>
    <span className='size-1.25 rounded-full bg-cream/28' />
  </span>
);

type PanelProps = {
  name: string;
  email: string;
  initials: string;
  userId: string;
  isAdmin: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onLeave: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * The open panel.
 *
 * A disclosure menu, not an ARIA `menu`. The first version carried
 * `role="menu"` with `role="menuitem"` rows, copying `AdminUserMenu` — but that
 * role is only valid there because the panel contains nothing *but* a menuitem.
 * `menu` may own menuitems, groups and separators, and this panel leads with an
 * identity block and a standing block that are none of those, which would put
 * the two things worth reading behind a role that does not admit them.
 *
 * So the rows are plain links in a list, natively focusable and announced as
 * links. That leaves Tab as the way through them, which is what the pattern
 * expects, and drops the roving tabindex and arrow keys the menu role required.
 *
 * Split into its own component so the focus-on-open effect is mount-scoped —
 * it runs when the panel appears rather than keying off a prop.
 */
const ProfileMenuPanel = ({
  name,
  email,
  initials,
  userId,
  isAdmin,
  onClose,
  onSignOut,
  onLeave,
}: PanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, []);

  // Tab moves through the panel normally; only Tab *off* either end closes it.
  // Without this the open panel would leak focus into the page behind it — the
  // defect in the menu this replaced. Handing focus back to the trigger means
  // the next Tab continues from where the user actually is in the page.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const edge = event.shiftKey ? items[0] : items[items.length - 1];
    if (document.activeElement !== edge) return;
    event.preventDefault();
    onLeave();
  };

  // `PROFILE_TABS` is the account dashboard's own section list, so a section
  // added or renamed there reaches this menu without a second list to remember.
  const rows: { key: string; label: string; href: string }[] = [
    ...PROFILE_TABS.map((tab) => ({
      key: tab.id,
      label: tab.label,
      href: tab.href,
    })),
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', href: '/dashboard' }] : []),
  ];

  return (
    // No `aria-labelledby` on this container: with the menu role gone it is a
    // roleless div, and a name on a generic is not announced. The list below
    // carries the name instead, where it names something real.
    <div
      ref={panelRef}
      onKeyDown={handleKeyDown}
      className='absolute right-0 z-10 mt-3.5 w-74 rounded-lg border border-cream/10 bg-ink text-cream shadow-2xl'
    >
      {/* Caret. Bordered on two sides only so the rotated square reads as a
          continuation of the panel's top edge rather than a diamond. */}
      <span
        aria-hidden
        className='absolute -top-1.5 right-4 size-3 rotate-45 border-t border-l border-cream/10 bg-ink'
      />

      <div className='relative flex items-center gap-3 border-b border-cream/9 p-4.5'>
        <div
          aria-hidden
          className='grid size-10.5 shrink-0 place-items-center rounded-full border border-camel/45 bg-camel/12 font-display text-[16px] tracking-[0.02em] text-camel'
        >
          {initials}
        </div>
        {/* The email is the point of this block on a demo account every visitor
            shares — it is the only answer to "whose account is this". Same
            reasoning as the account dashboard's identity row. */}
        <div className='min-w-0'>
          <p className='truncate font-display text-[19px] leading-tight'>{name}</p>
          {email && (
            <p className='mt-0.5 truncate text-[12.5px] text-cream/55'>{email}</p>
          )}
        </div>
      </div>

      <ProfileMenuStanding userId={userId} />

      <ul aria-label='Account sections' className='p-2'>
        {rows.map((row) => (
          <li key={row.key}>
            <Link
              href={row.href}
              onClick={onClose}
              className={`${ROW_CLASS} text-cream/88 hover:bg-cream/8 hover:text-cream ${FOCUS_RING_DARK}`}
            >
              <Dot />
              <span className='min-w-0 flex-1 truncate'>{row.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className='border-t border-cream/9 p-2'>
        <button
          type='button'
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className={`${ROW_CLASS} text-oxblood-bright hover:bg-oxblood/22 ${FOCUS_RING_DARK}`}
        >
          <span className='flex w-3.75 shrink-0 justify-center'>
            <SignOutIcon className='h-3.75 w-3.75' />
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};

const ProfileMenu = ({
  profileImage,
  name,
  email,
  initials,
  userId,
  isAdmin,
  rewardPoints,
  isOpen,
  onToggle,
  onClose,
  onSignOut,
}: ProfileMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // mousedown (not click) so we close before any inside onClick fires —
  // avoids double-handling for menu-item clicks that trigger navigation.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen, onClose]);

  const closeAndRestore = useCallback(() => {
    onClose();
    triggerRef.current?.focus();
  }, [onClose]);

  useDismissOnEscape(isOpen, closeAndRestore);

  const avatarColor = resolveAvatarColor(userId, isAdmin, rewardPoints);

  return (
    <div ref={containerRef} className='relative'>
      <button
        ref={triggerRef}
        type='button'
        id='user-menu-button'
        // `true` rather than `menu`: the panel is a disclosure, not an ARIA
        // menu — see ProfileMenuPanel.
        aria-haspopup='true'
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`rounded-full transition-shadow motion-reduce:transition-none ${FOCUS_RING} ${
          isOpen ? 'ring-2 ring-camel' : 'ring-1 ring-line hover:ring-camel'
        }`}
      >
        {/* Reads as the thing rather than the action — "Open user menu" made
            the announcement an instruction. The open/closed state is
            `aria-expanded`'s job, not the name's. */}
        <span className='sr-only'>Account menu</span>
        {profileImage ? (
          <Image
            src={profileImage}
            width={72}
            height={72}
            sizes='36px'
            // Decorative — the button is already named above, and "User
            // profile" only appended a second noun to that name.
            alt=''
            className='h-9 w-9 rounded-full object-cover'
          />
        ) : (
          <div
            aria-hidden='true'
            className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold ${avatarColor}`}
          >
            {initials}
          </div>
        )}
      </button>

      {isOpen && (
        <ProfileMenuPanel
          name={name}
          email={email}
          initials={initials}
          userId={userId}
          isAdmin={isAdmin}
          onClose={onClose}
          onSignOut={onSignOut}
          onLeave={closeAndRestore}
        />
      )}
    </div>
  );
};

export default ProfileMenu;
