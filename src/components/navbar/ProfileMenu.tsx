'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { AVATAR_COLORS, MEMBER_AVATAR_COLORS } from '@/lib/admin/constants';
import { avatarColorForId } from '@/lib/format';
import { FOCUS_RING } from '@/lib/styles';

type ProfileMenuProps = {
  profileImage?: string;
  initials: string;
  userId: string;
  isAdmin: boolean;
  rewardPoints: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
};

const ITEM_CLASS =
  'block w-full px-4 py-2 text-left text-sm text-ink-soft transition-colors motion-reduce:transition-none hover:bg-cream-deep focus-visible:outline-none focus-visible:bg-cream-deep focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-inset';

const ADMIN_AVATAR = 'bg-linear-to-br from-ink to-oxblood-deep text-camel';

const resolveAvatarColor = (userId: string, isAdmin: boolean, rewardPoints: number): string => {
  if (isAdmin) return ADMIN_AVATAR;
  if (rewardPoints >= 250) return avatarColorForId(userId, MEMBER_AVATAR_COLORS);
  return avatarColorForId(userId, AVATAR_COLORS);
};

const ProfileMenu = ({
  profileImage,
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
  const firstItemRef = useRef<HTMLAnchorElement>(null);

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    };

    firstItemRef.current?.focus();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const avatarColor = resolveAvatarColor(userId, isAdmin, rewardPoints);

  return (
    <div ref={containerRef} className='relative'>
      <button
        ref={triggerRef}
        type='button'
        id='user-menu-button'
        aria-expanded={isOpen}
        onClick={onToggle}
        className={`rounded-full ring-1 ring-line transition-shadow motion-reduce:transition-none hover:ring-camel ${FOCUS_RING}`}
      >
        <span className='sr-only'>Open user menu</span>
        {profileImage ? (
          <Image
            src={profileImage}
            width={72}
            height={72}
            sizes='36px'
            alt='User profile'
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
        <div
          aria-labelledby='user-menu-button'
          className='absolute right-0 z-10 mt-3 w-48 rounded-md border border-line bg-paper py-1 shadow-lg ring-1 ring-black/5'
        >
          <Link
            ref={firstItemRef}
            href='/profile'
            onClick={onClose}
            className={ITEM_CLASS}
          >
            Your Profile
          </Link>
          <Link href='/profile?tab=saved' onClick={onClose} className={ITEM_CLASS}>
            Saved Cuts
          </Link>
          <button
            type='button'
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className={ITEM_CLASS}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
