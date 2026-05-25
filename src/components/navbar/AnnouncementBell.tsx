'use client';

import { useEffect, useRef, useState } from 'react';
import { FaBell } from 'react-icons/fa';

import type { Announcement } from '@/lib/announcements/data';
import { ANNOUNCEMENT_DOT_BG } from '@/lib/announcements/display';
import { FOCUS_RING, scrollAwareTone } from '@/lib/styles';
import { useIsMounted } from '@/hooks/useIsMounted';
import AnnouncementBellPopover from './AnnouncementBellPopover';

type AnnouncementBellProps = {
  announcements: Announcement[];
  scrolled?: boolean;
};

const DISMISS_PREFIX = 'announcement-dismissed-';

const loadDismissed = (ids: string[]): Record<string, true> => {
  if (typeof window === 'undefined') return {};
  const next: Record<string, true> = {};
  for (const id of ids) {
    try {
      if (window.localStorage.getItem(`${DISMISS_PREFIX}${id}`) === '1') {
        next[id] = true;
      }
    } catch {
      // localStorage unavailable (private mode, etc.) — treat as not dismissed
    }
  }
  return next;
};

const AnnouncementBell = ({
  announcements,
  scrolled = false,
}: AnnouncementBellProps) => {
  const [open, setOpen] = useState(false);
  const mounted = useIsMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  // Hydrate dismissed state from localStorage on first render of each
  // announcements set. Lazy + adjust-during-render keeps the read out of
  // useEffect so the rule doesn't flag a setState cascade; the component
  // still returns null until `mounted` is true (after hydration) so the
  // SSR HTML matches the first client paint.
  const announcementIdsKey = announcements.map((a) => a.id).join(',');
  const [dismissed, setDismissed] = useState<Record<string, true>>(() =>
    loadDismissed(announcements.map((a) => a.id)),
  );
  const [lastAnnouncementIdsKey, setLastAnnouncementIdsKey] = useState(announcementIdsKey);
  if (lastAnnouncementIdsKey !== announcementIdsKey) {
    setLastAnnouncementIdsKey(announcementIdsKey);
    setDismissed(loadDismissed(announcements.map((a) => a.id)));
  }

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleDismiss = (id: string) => {
    try {
      window.localStorage.setItem(`${DISMISS_PREFIX}${id}`, '1');
    } catch {
      // localStorage unavailable — dismissal is in-memory only this session
    }
    setDismissed((prev) => ({ ...prev, [id]: true }));
  };

  const visible = announcements.filter((a) => !dismissed[a.id]);

  if (!mounted || visible.length === 0) return null;

  const toneClass = scrollAwareTone(scrolled, {
    hoverScrolled: 'hover:text-oxblood',
    hoverHero: 'hover:text-camel-soft',
  });

  const dotBg = ANNOUNCEMENT_DOT_BG[visible[0].accent];
  const ringBg = scrolled ? 'ring-cream' : 'ring-transparent';

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup='dialog'
        aria-label={`Announcements, ${visible.length} active`}
        className={`relative rounded-full p-2 transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING} ${toneClass}`}
      >
        <FaBell size={20} aria-hidden='true' />
        <span
          aria-hidden='true'
          className={`pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ${dotBg} ${ringBg}`}
        />
      </button>

      {open && (
        <AnnouncementBellPopover
          announcements={visible}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
};

export default AnnouncementBell;
