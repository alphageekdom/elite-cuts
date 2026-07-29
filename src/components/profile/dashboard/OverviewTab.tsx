import Link from 'next/link';

import { FOCUS_RING } from '@/lib/styles';
import {
  formatInShopZone,
  shopMinutesOfDay,
} from '@/lib/shop-settings/pickup-format';
import type { Habit } from '@/lib/profile/dashboard';
import type { ProfileOrder } from '@/types/profile';
import ProfileRecentlyViewed from '@/components/profile/ProfileRecentlyViewed';
import ActiveOrderCard from './ActiveOrderCard';
import BuyItAgain, { type RepeatCut } from './BuyItAgain';
import FirstVisitBlock from './FirstVisitBlock';
import HabitsPanel from './HabitsPanel';
import RecentOrdersPanel from './RecentOrdersPanel';

type Props = {
  firstName: string;
  orders: ProfileOrder[];
  activeOrder: ProfileOrder | null;
  repeatCuts: RepeatCut[];
  habits: Habit[];
  leadTime: string;
  /** Shop's IANA timezone from settings — the clock the greeting reads. */
  timezone: string;
  points: number;
  worthDollars: number;
  capNote: string | null;
};

// Greeting and date read the shop's clock, not the server's.
//
// This renders on the server, so `new Date().getHours()` is the runtime's zone
// — UTC on Vercel. A San Diego visitor at 5:30 pm would have been greeted with
// "Morning," above tomorrow's date. Same class of bug the confirmation page
// fixed with `formatInShopZone`.
function greeting(timezone: string, now: Date): string {
  const minutes = shopMinutesOfDay(timezone, now);
  // Unparseable zone — the helper returns null rather than throwing, and a
  // neutral greeting beats a confidently wrong one.
  if (minutes === null) return 'Hello';
  const hour = Math.floor(minutes / 60);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default function OverviewTab({
  firstName,
  orders,
  activeOrder,
  repeatCuts,
  habits,
  leadTime,
  timezone,
  points,
  worthDollars,
  capNote,
}: Props) {
  const now = new Date();
  const hasOrders = orders.length > 0;
  const recent = orders.slice(0, 4);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-camel-deep">
            {formatInShopZone(now, timezone, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            }).replace(',', ' ·')}
          </p>
          <h1 className="mt-3 font-display text-[34px] leading-[1.05] tracking-tight sm:text-[42px]">
            {greeting(timezone, now)},{' '}
            <em className="italic text-oxblood">{firstName}.</em>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/profile?tab=messages"
            className={`inline-flex min-h-11 items-center rounded-full border border-line px-4.5 py-2.5 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink ${FOCUS_RING} focus-visible:ring-offset-cream`}
          >
            Message the shop
          </Link>
          <Link
            href="/products"
            className={`inline-flex min-h-11 items-center rounded-full bg-ink px-4.5 py-2.5 text-[13px] text-cream transition-colors hover:bg-oxblood ${FOCUS_RING} focus-visible:ring-offset-cream`}
          >
            Browse cuts
          </Link>
        </div>
      </header>

      <div className="mt-7">
        {activeOrder ? (
          <ActiveOrderCard order={activeOrder} leadTime={leadTime} />
        ) : hasOrders ? (
          // Has history, nothing in flight. A dedicated "nothing in the
          // cutting room" card would be a whole dark block saying nothing, so
          // the section simply steps aside and the history leads instead.
          null
        ) : (
          <FirstVisitBlock
            points={points}
            worthDollars={worthDollars}
            capNote={capNote}
          />
        )}
      </div>

      <BuyItAgain cuts={repeatCuts} />

      {/* Two columns only when both are filled. With no orders the recent-
          orders panel is absent and grid auto-placement drops the remaining
          column into the 1.35fr slot, leaving a third of the row empty beside
          a single card — so the row stays one column until there is a second
          thing to put in it. */}
      <div
        className={`mt-8 grid grid-cols-1 items-start gap-5 ${
          hasOrders ? 'xl:grid-cols-[1.35fr_1fr]' : ''
        }`}
      >
        {hasOrders && <RecentOrdersPanel orders={recent} />}
        <div className="flex flex-col gap-5">
          <HabitsPanel habits={habits} />
          {/* Fills the slot the design gave a "From the counter" quote card
              attributed to a named head butcher. A message's stored author is
              the customer's own name and no shop-side author field exists, so
              the quote was fiction; this is a real list of what the visitor
              actually opened. */}
          <ProfileRecentlyViewed />
        </div>
      </div>
    </div>
  );
}
