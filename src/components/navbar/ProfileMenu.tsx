'use client';

import { useEffect, useRef } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';

import ProfileImage from '@/assets/images/user-default.png';
import { FOCUS_RING } from '@/lib/styles';

type ProfileMenuProps = {
  profileImage?: string | StaticImageData;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
};

const ITEM_CLASS =
  'block w-full px-4 py-2 text-left text-sm text-ink-soft transition-colors motion-reduce:transition-none hover:bg-cream-deep';

const ProfileMenu = ({
  profileImage,
  isOpen,
  onToggle,
  onClose,
  onSignOut,
}: ProfileMenuProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        id='user-menu-button'
        aria-expanded={isOpen}
        aria-haspopup='menu'
        onClick={onToggle}
        className={`rounded-full ring-1 ring-line transition-shadow motion-reduce:transition-none hover:ring-camel ${FOCUS_RING}`}
      >
        <span className='sr-only'>Open user menu</span>
        <Image
          src={profileImage || ProfileImage}
          width={72}
          height={72}
          sizes='36px'
          alt='User profile'
          className='h-9 w-9 rounded-full'
        />
      </button>
      {isOpen && (
        <div
          role='menu'
          aria-orientation='vertical'
          aria-labelledby='user-menu-button'
          tabIndex={-1}
          className='absolute right-0 z-10 mt-3 w-48 rounded-md border border-line bg-paper py-1 shadow-lg ring-1 ring-black/5'
        >
          <Link
            href='/profile'
            role='menuitem'
            tabIndex={-1}
            onClick={onClose}
            className={ITEM_CLASS}
          >
            Your Profile
          </Link>
          <Link
            href='/products/saved'
            role='menuitem'
            tabIndex={-1}
            onClick={onClose}
            className={ITEM_CLASS}
          >
            Saved Cuts
          </Link>
          <button
            type='button'
            role='menuitem'
            tabIndex={-1}
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
