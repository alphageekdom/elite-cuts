import Link from 'next/link';

type Props = {
  title: string;
  /** Where the card's full tab lives. */
  href: string;
  /** Short link label, e.g. "Inbox" or "Schedule". */
  linkLabel: string;
};

// Title + "see the full tab" link, shared by the dashboard's sidecar cards.
//
// The same eight lines sat in two cards, including the padding-and-negative-
// margin trick that gives the link a tappable hit area without moving it off
// the heading's baseline — exactly the kind of detail that drifts when it is
// written twice. Mirrors `ScheduleCardHeader`, which does this for the
// schedule page's three sidebar cards.
export default function DashboardCardHeader({ title, href, linkLabel }: Props) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-[21px] leading-snug tracking-[-0.015em]">{title}</h2>
      <Link
        href={href}
        className="-my-3 -mr-2 rounded-sm py-3 pr-2 text-[12.5px] text-oxblood underline decoration-from-font underline-offset-4 transition-colors hover:text-oxblood-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
