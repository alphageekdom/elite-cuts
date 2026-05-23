'use client';
import { avatarColorForId, getInitials, formatDate } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import MessageStatusPill from './MessageStatusPill';
import type { MessageRow } from './MessagesClient';

type Props = {
  message: MessageRow;
  toggling: boolean;
  onClose: () => void;
  onToggleStatus: (msg: MessageRow) => void;
};

// Drawer body — wrapped in `SlideDrawer` by the parent for focus trap +
// Escape close + aria-modal. The h2's `id="message-drawer-title"` matches
// the `ariaLabelledBy` SlideDrawer is configured with.
export default function MessageDrawer({ message, toggling, onClose, onToggleStatus }: Props) {
  return (
    <>
      <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
        <div className="pr-4">
          <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">Message</div>
          <h2 id="message-drawer-title" className="font-display text-[20px] font-normal tracking-tight leading-snug">
            {message.subject}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-4 border-b border-line-soft shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold shrink-0 ${avatarColorForId(message.id, AVATAR_COLORS)}`}>
            {getInitials(message.customerName)}
          </div>
          <div>
            <div className="text-[14px] font-medium text-ink">{message.customerName}</div>
            <a
              href={`mailto:${message.customerEmail}?subject=Re: ${encodeURIComponent(message.subject)}`}
              className="text-[12px] text-muted hover:text-oxblood transition-colors"
            >
              {message.customerEmail}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] text-muted pt-1">
          <span>{formatDate(message.createdAt)}</span>
          {message.orderRef && (
            <span className="font-mono bg-cream-deep text-ink-soft px-2 py-0.5 rounded">
              #{message.orderRef}
            </span>
          )}
          <MessageStatusPill status={message.status} />
        </div>
      </div>

      <div className="px-6 py-5 flex-1">
        <div className="text-[11px] tracking-widest uppercase text-muted mb-2">Message</div>
        <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">{message.body}</p>
      </div>

      <div className="px-6 py-5 border-t border-line-soft shrink-0 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onToggleStatus(message)}
          disabled={toggling}
          className="w-full py-2.5 text-[13px] font-medium rounded-full border border-ink text-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-50"
        >
          {toggling ? 'Updating…' : message.status === 'open' ? 'Mark as closed' : 'Re-open inquiry'}
        </button>
        <a
          href={`mailto:${message.customerEmail}?subject=Re: ${encodeURIComponent(message.subject)}`}
          className="w-full py-2.5 text-[13px] font-medium rounded-full bg-ink text-cream text-center hover:bg-oxblood transition-colors"
        >
          Reply via email
        </a>
      </div>
    </>
  );
}
