'use client';
import { avatarColorForId, relativeTime, getInitials } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin/constants';
import MessageStatusPill from './MessageStatusPill';
import type { MessageRow } from './MessagesClient';

type Props = {
  msg: MessageRow;
  toggling: boolean;
  onOpen: (msg: MessageRow) => void;
  onToggleStatus: (msg: MessageRow) => void;
};

// Mobile-only card variant (below sm:). The desktop table overflows iPhone
// widths so each row renders as a stacked card instead.
export default function MessageCard({ msg, toggling, onOpen, onToggleStatus }: Props) {
  // A closed message is marked by its status pill, not by dimming. The
  // `opacity-60` that used to sit on this card compounded into every child:
  // the email, the timestamp and the Close button itself all fell to 2.38:1,
  // and `hover:opacity-100` meant only a mouse user could recover them.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(msg)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(msg);
        }
      }}
      className="group flex w-full cursor-pointer flex-col gap-2 rounded-sm border border-line-soft bg-paper px-4 py-4 text-left transition-colors hover:border-line hover:bg-cream focus:outline-none focus-visible:border-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold shrink-0 ${avatarColorForId(msg.id, AVATAR_COLORS)}`}>
            {getInitials(msg.customerName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">{msg.customerName}</div>
            <div className="truncate text-[11px] text-muted">{msg.customerEmail}</div>
          </div>
        </div>
        <MessageStatusPill status={msg.status} className="shrink-0" />
      </div>
      <div className="line-clamp-2 text-[13px] text-ink">{msg.subject}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span>{relativeTime(msg.createdAt)}</span>
          {msg.orderRef && (
            <>
              <span className="text-muted/50">·</span>
              <span className="font-mono">#{msg.orderRef}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleStatus(msg); }}
          disabled={toggling}
          className="rounded-full border border-line px-3 py-1 text-[11px] text-muted transition-colors hover:border-ink/30 hover:text-ink whitespace-nowrap disabled:opacity-50"
        >
          {msg.status === 'open' ? 'Close' : 'Re-open'}
        </button>
      </div>
    </div>
  );
}
