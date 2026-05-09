'use client';
import { useState } from 'react';
import ContactModal from './ContactModal';
import type { MessageStatus } from '@/models/Message';

export type SerializedMessage = {
  _id: string;
  subject: string;
  body: string;
  orderRef?: string;
  status: MessageStatus;
  createdAt: string;
};

type Props = {
  messages: SerializedMessage[];
};

function statusPill(status: MessageStatus) {
  return status === 'open'
    ? 'bg-camel/15 text-camel'
    : 'bg-cream-deep text-muted';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfileMessages({ messages }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section>
        <div className="flex items-end justify-between mb-7 gap-5">
          <h2 className="font-display text-[28px] font-normal tracking-tight leading-tight">
            Your <em className="italic text-oxblood">messages</em>
            {messages.length > 0 && (
              <span className="ml-3 font-sans text-[15px] font-normal text-muted align-middle">
                ({messages.length})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-ink text-cream px-4 py-2 rounded-full hover:bg-oxblood transition-colors whitespace-nowrap shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New inquiry
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="bg-paper border border-dashed border-line rounded p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-cream-deep text-ink-soft flex items-center justify-center mx-auto mb-5" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="font-display font-medium text-[22px] tracking-tight mb-2">No messages yet</h3>
            <p className="text-muted text-sm mb-6 max-w-[32ch] mx-auto">
              Have a question or need help with an order? We&apos;re here.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-3 rounded-full hover:bg-oxblood transition-colors"
            >
              Send a message
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className="bg-paper border border-line-soft rounded px-5 py-4 flex items-start gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-cream-deep text-muted flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {msg.orderRef && (
                      <span className="font-mono text-[11px] text-ink-soft bg-cream-deep px-2 py-0.5 rounded">
                        #{msg.orderRef}
                      </span>
                    )}
                    <span className="text-[11px] tracking-[0.14em] uppercase text-muted">
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>
                  <p className="font-display font-medium text-[17px] tracking-tight truncate">
                    {msg.subject}
                  </p>
                  <p className="text-[13px] text-muted mt-0.5 line-clamp-1">{msg.body}</p>
                </div>

                {/* Status */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap shrink-0 mt-0.5 ${statusPill(msg.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                  {msg.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <ContactModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
