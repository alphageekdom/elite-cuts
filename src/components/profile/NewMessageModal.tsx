'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useScrollLock } from '@/hooks/useScrollLock';
import { messageInputSchema } from '@/lib/messages/schema';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  prefilledSubject?: string;
  prefilledOrderId?: string;
  prefilledOrderRef?: string;
};

const SHOP_EMAIL = 'hello@elitecuts.com';
const SUBJECT_MAX = 120;
const BODY_MAX = 2000;

export default function NewMessageModal({
  isOpen,
  onClose,
  prefilledSubject = '',
  prefilledOrderId,
  prefilledOrderRef,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'inapp' | 'email'>('inapp');
  const [subject, setSubject] = useState(prefilledSubject);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Adjust state while rendering: sync subject when the parent passes a new
  // prefilledSubject (e.g. opening contact for a different order), and reset
  // the tab + body when the modal goes from open → closed.
  const [lastPrefilled, setLastPrefilled] = useState(prefilledSubject);
  if (lastPrefilled !== prefilledSubject) {
    setLastPrefilled(prefilledSubject);
    setSubject(prefilledSubject);
  }
  const [lastIsOpen, setLastIsOpen] = useState(isOpen);
  if (lastIsOpen !== isOpen) {
    setLastIsOpen(isOpen);
    if (!isOpen) {
      setTab('inapp');
      setBody('');
    }
  }

  useScrollLock(isOpen);

  // Focus subject on open
  useEffect(() => {
    if (isOpen && tab === 'inapp') {
      setTimeout(() => subjectRef.current?.focus(), 50);
    }
  }, [isOpen, tab]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mailtoHref = `mailto:${SHOP_EMAIL}?subject=${encodeURIComponent(subject || 'EliteCuts inquiry')}&body=${encodeURIComponent(body ? `${body}\n\n---\n${prefilledOrderRef ? `Order: #${prefilledOrderRef}` : ''}` : '')}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate client-side through the same Zod schema the server uses so the
    // customer sees a clear field message instead of a round-trip generic.
    const parsed = messageInputSchema.safeParse({
      subject,
      body,
      orderId: prefilledOrderId,
      orderRef: prefilledOrderRef,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please fill out subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: parsed.data.subject,
          body: parsed.data.body,
          ...(parsed.data.orderId ? { orderId: parsed.data.orderId } : {}),
          ...(parsed.data.orderRef ? { orderRef: parsed.data.orderRef } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message ?? 'Failed to send message');
        return;
      }

      toast.success('Message sent — we\'ll be in touch.');
      setBody('');
      onClose();
      router.refresh();
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-modal-title"
        className="relative bg-paper border border-line-soft rounded-xl w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line-soft">
          <div>
            <h2
              id="new-message-modal-title"
              className="font-display text-[22px] font-normal tracking-tight"
            >
              Contact <em className="italic text-oxblood">us</em>
            </h2>
            {prefilledOrderRef && (
              <p className="text-[12px] text-muted mt-0.5 font-mono">Order #{prefilledOrderRef}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep focus-visible:outline-none focus-visible:text-ink focus-visible:bg-cream-deep transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Option tabs */}
        <div className="flex gap-2 px-6 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setTab('inapp')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
              tab === 'inapp'
                ? 'bg-ink text-cream border-ink'
                : 'bg-transparent text-muted border-line hover:border-ink hover:text-ink'
            }`}
          >
            Message us
          </button>
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
              tab === 'email'
                ? 'bg-ink text-cream border-ink'
                : 'bg-transparent text-muted border-line hover:border-ink hover:text-ink'
            }`}
          >
            Email us
          </button>
        </div>

        {/* In-app form */}
        {tab === 'inapp' && (
          <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 space-y-4">
            <div>
              <label
                htmlFor="inapp-subject"
                className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1.5"
              >
                Subject
              </label>
              <input
                id="inapp-subject"
                ref={subjectRef}
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
                placeholder="What's on your mind?"
                required
                className="w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
              />
              <div className="text-right text-[11px] text-muted mt-1">{subject.length}/{SUBJECT_MAX}</div>
            </div>

            <div>
              <label
                htmlFor="inapp-body"
                className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1.5"
              >
                Message
              </label>
              <textarea
                id="inapp-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                placeholder="Tell us how we can help…"
                required
                rows={5}
                className="w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none"
              />
              <div className="text-right text-[11px] text-muted -mt-0.5">{body.length}/{BODY_MAX}</div>
            </div>

            <button
              type="submit"
              disabled={submitting || !subject.trim() || !body.trim()}
              className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}

        {/* Email option */}
        {tab === 'email' && (
          <div className="px-6 pb-6 pt-4 space-y-4">
            <div>
              <label
                htmlFor="email-subject"
                className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1.5"
              >
                Subject
              </label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
                placeholder="What's on your mind?"
                className="w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <div>
              <label
                htmlFor="email-body"
                className="block text-[11px] font-medium text-ink-soft tracking-[0.06em] uppercase mb-1.5"
              >
                Message (optional pre-fill)
              </label>
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                placeholder="Add context before opening your mail client…"
                rows={4}
                className="w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none"
              />
            </div>
            <a
              href={mailtoHref}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-paper transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Open mail client
            </a>
            <p className="text-center text-[11px] text-muted">
              Sends to{' '}
              <span className="font-mono text-ink">{SHOP_EMAIL}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
