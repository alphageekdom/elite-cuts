import DashboardCardHeader from './DashboardCardHeader';
import { getInitials, relativeTime } from '@/lib/format';

export type InboxRow = {
  id: string;
  authorName: string;
  subject: string;
  body: string;
  createdAt: string;
};

type Props = {
  rows: InboxRow[];
  openCount: number;
};

// Open customer messages, oldest first — the ones actually waiting on a reply.
// The design put a "Reply" button on each. A Message is a single body with an
// open/closed status; there is no thread to reply into and no channel to reply
// through, so the card links to the messages tab where an admin answers in
// person and closes the conversation.

export default function DashboardWaitingOnYou({ rows, openCount }: Props) {
  return (
    <section className="rounded-sm border border-line-soft bg-paper px-6 py-6">
      <DashboardCardHeader title="Waiting on you" href="/dashboard/messages" linkLabel="Inbox" />

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          {openCount === 0
            ? 'No open messages. New ones land here as customers send them.'
            : 'No open messages to show.'}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line-soft">
          {rows.map((row) => (
            <li key={row.id} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-display text-[11px] font-semibold text-cream"
                >
                  {getInitials(row.authorName)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{row.authorName}</span>
                <span className="shrink-0 font-mono text-[10.5px] whitespace-nowrap text-muted">
                  {relativeTime(row.createdAt)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 pl-10 text-[13px] leading-relaxed text-ink-soft">
                {row.subject}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
