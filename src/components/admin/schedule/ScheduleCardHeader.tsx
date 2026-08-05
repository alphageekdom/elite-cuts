import Link from 'next/link';
import type { ReactNode } from 'react';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';

type Props = {
  title: ReactNode;     // the prefix before the accent (e.g. "On")
  accent: ReactNode;    // the italic accent (e.g. "today")
  linkHref: string;
  linkLabel: ReactNode; // text inside the right-aligned link (e.g. "All staff")
};

// Shared header used by the three sidebar cards (`On today`, `Pickup slots`,
// `Shop hours`). Each card carried an identical 7-line ChevronRight SVG and
// the same flex-between header chrome before this consolidation.
export default function ScheduleCardHeader({ title, accent, linkHref, linkLabel }: Props) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <span className="font-display text-lg font-medium tracking-tight">
        {title} <em className="italic text-oxblood font-normal">{accent}</em>
      </span>
      <Link
        href={linkHref}
        className="text-xs text-ink-soft border-b border-line pb-px inline-flex items-center gap-1 hover:text-oxblood transition-colors"
      >
        {linkLabel}
        <ArrowIcon className="w-2.5 h-2.5" />
      </Link>
    </div>
  );
}
