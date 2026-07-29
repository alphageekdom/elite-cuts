import Link from 'next/link';

import { FOCUS_RING } from '@/lib/styles';
import type { ProfileTabId } from './tabs';
import { PROFILE_TABS } from './tabs';

type Props = {
  activeTab: ProfileTabId;
  counts: Partial<Record<ProfileTabId, number>>;
};

/**
 * The dashboard's section nav.
 *
 * A vertical list in the sidebar from `lg` up; below that it becomes a
 * horizontally-scrolling row, because six stacked full-width rows would push
 * the actual content off a phone screen before the visitor sees any of it.
 */
export default function ProfileNav({ activeTab, counts }: Props) {
  return (
    <nav aria-label="Account sections" className="relative -mx-5 lg:mx-0">
      {/* Signals the row scrolls; the sidebar column has no overflow to hint at. */}
      <div
        aria-hidden
        className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-cream to-transparent pointer-events-none lg:hidden"
      />
      <ul className="flex gap-1.5 overflow-x-auto px-5 pr-10 scrollbar-none lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pr-0 [&::-webkit-scrollbar]:hidden">
        {PROFILE_TABS.map((tab) => {
          const { id, label, href } = tab;
          const isActive = activeTab === id;
          const count = counts[id];
          const noun = 'countNoun' in tab ? tab.countNoun : null;
          // The badge is spoken through the link's own name rather than an
          // sr-only span inside it. That span was `position: absolute` with
          // every ancestor static up to the `relative` <nav>, so it resolved
          // against the nav instead of the scrolling <ul> — escaping the
          // scroll container and planting itself at the far end of the
          // scrolled content, which dragged ~148px of horizontal scroll onto
          // the whole page at phone widths, on every tab.
          const spokenName =
            count && noun
              ? `${label}, ${count} ${count === 1 ? noun[0] : noun[1]}`
              : undefined;

          return (
            <li key={id} className="shrink-0 lg:shrink">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                aria-label={spokenName}
                className={`flex min-h-11 items-center justify-between gap-2.5 rounded-sm px-3.5 py-2.5 text-[14.5px] whitespace-nowrap transition-colors ${FOCUS_RING} focus-visible:ring-offset-cream ${
                  isActive
                    ? 'bg-cream-deep font-medium text-ink'
                    : 'text-ink-soft hover:bg-cream-deep/50 hover:text-ink'
                }`}
              >
                <span>{label}</span>
                {!!count && (
                  <span
                    aria-hidden
                    className={`flex h-4.75 min-w-4.75 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums ${
                      isActive
                        ? 'bg-ink text-cream'
                        : 'bg-cream-deep text-ink-soft lg:bg-line-soft'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
