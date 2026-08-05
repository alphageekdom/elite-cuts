'use client';
import { avatarColorForId, relativeTime, getInitials } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin/constants';
import MessageStatusPill from './MessageStatusPill';
import type { MessageRow } from './MessagesClient';
import ChevronIcon from '@/components/ui/icons/ChevronIcon';

type Props = {
  msg: MessageRow;
  toggling: boolean;
  onOpen: (msg: MessageRow) => void;
  onToggleStatus: (msg: MessageRow) => void;
};

// Desktop table row — sm+. Below sm the messages list switches to
// MessageCard for an iPhone-readable stack.
export default function MessageTableRow({ msg, toggling, onOpen, onToggleStatus }: Props) {
  // The `bg-cream-deep/30` tint and the status pill both mark a closed row, so
  // the `opacity-60` that used to ride alongside them was redundant as well as
  // harmful: it compounded into every cell, taking the email, the timestamp
  // and the Close button to 2.38:1, and `hover:opacity-100` handed them back
  // only to a mouse user. Measured at 4.81:1 with the tint alone.
  //
  // This is the only admin table that tints a row by status — promos, staff
  // and the mobile MessageCard all leave it to the pill — so it reads as drift
  // and an audit has already been tempted to remove it once. Keep it: messages
  // is the one table whose state axis is binary and is also the page's
  // organising principle (the filter strip is All / Open / Closed), which is
  // what makes a two-tone row worth scanning. Promos has five statuses and
  // staff three; neither reduces that way.
  return (
    <tr
      className={`group cursor-pointer transition-colors ${
        msg.status === 'closed'
          ? 'bg-cream-deep/30 hover:bg-cream-deep/50'
          : 'hover:bg-cream-deep/40'
      }`}
      onClick={() => onOpen(msg)}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0 ${avatarColorForId(msg.id, AVATAR_COLORS)}`}>
            {getInitials(msg.customerName)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink max-w-40 md:max-w-50 lg:max-w-none">{msg.customerName}</div>
            <div className="truncate text-[11px] text-muted max-w-40 md:max-w-50 lg:max-w-none">{msg.customerEmail}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 max-w-50 md:max-w-80">
        <span className="block truncate text-[13px] text-ink">{msg.subject}</span>
      </td>

      <td className="px-4 py-3.5 hidden md:table-cell whitespace-nowrap">
        {msg.orderRef ? (
          <span className="font-mono text-[11px] text-ink-soft bg-cream-deep px-2 py-0.5 rounded">
            #{msg.orderRef}
          </span>
        ) : (
          <span className="text-muted text-[12px]">—</span>
        )}
      </td>

      <td className="px-4 py-3.5 hidden lg:table-cell text-[12px] text-muted whitespace-nowrap">
        {relativeTime(msg.createdAt)}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        <MessageStatusPill status={msg.status} />
      </td>

      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleStatus(msg)}
            disabled={toggling}
            className="text-[12px] text-muted hover:text-ink border border-line hover:border-ink/30 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {msg.status === 'open' ? 'Close' : 'Re-open'}
          </button>
          <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-muted/40 transition-colors group-hover:text-oxblood" direction="right" />
        </div>
      </td>
    </tr>
  );
}
