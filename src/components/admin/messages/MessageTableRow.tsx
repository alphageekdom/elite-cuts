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

// Desktop table row — sm+. Below sm the messages list switches to
// MessageCard for an iPhone-readable stack.
export default function MessageTableRow({ msg, toggling, onOpen, onToggleStatus }: Props) {
  return (
    <tr
      className={`group cursor-pointer transition-colors ${
        msg.status === 'closed'
          ? 'bg-cream-deep/30 opacity-60 hover:opacity-100 hover:bg-cream-deep/50'
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
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted/40 transition-colors group-hover:text-oxblood"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </td>
    </tr>
  );
}
