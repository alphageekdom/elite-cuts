import type { MessageStatus } from '@/lib/messages/constants';

// Small status pill used by the mobile card, desktop table cell, and drawer
// meta row. Centralizing the class string + dot-plus-text shape so a future
// status (e.g. 'archived') only needs one map updated.

const STYLE: Record<MessageStatus, string> = {
  open: 'bg-camel/15 text-camel-deep',
  closed: 'bg-cream-deep text-muted',
};

const LABEL: Record<MessageStatus, string> = {
  open: 'Open',
  closed: 'Closed',
};

type Props = {
  status: MessageStatus;
  className?: string;
};

export default function MessageStatusPill({ status, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${STYLE[status]} ${className}`.trim()}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABEL[status]}
    </span>
  );
}
