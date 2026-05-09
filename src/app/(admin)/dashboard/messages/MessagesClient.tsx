'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { avatarColorForId, relativeTime, statCellBorderClasses } from '@/lib/admin-utils';
import { AVATAR_COLORS } from '@/lib/admin-constants';

import type { MessageStatus } from '@/models/Message';

export type MessageRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  body: string;
  orderRef?: string;
  status: MessageStatus;
  createdAt: string;
};

export type MessageCounts = {
  all: number;
  open: number;
  closed: number;
};

type Filter = 'all' | 'open' | 'closed';

function statusPill(status: MessageStatus) {
  return status === 'open'
    ? 'bg-camel/15 text-camel'
    : 'bg-cream-deep text-muted';
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STAT_CELLS: { key: Filter; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'open',   label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

export default function MessagesClient({
  messages: initialMessages,
}: {
  messages: MessageRow[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<MessageRow | null>(null);
  const [toggling, setToggling] = useState(false);

  const filtered = messages.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      m.customerName.toLowerCase().includes(q) ||
      m.customerEmail.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      (m.orderRef?.toLowerCase().includes(q) ?? false);
    return matchesFilter && matchesSearch;
  });

  async function toggleStatus(msg: MessageRow) {
    const next: MessageStatus = msg.status === 'open' ? 'closed' : 'open';
    setToggling(true);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();

      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: next } : m)),
      );
      if (drawer?.id === msg.id) setDrawer((prev) => prev ? { ...prev, status: next } : prev);
      toast.success(`Marked as ${next}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  }

  const liveCounts = {
    all: messages.length,
    open: messages.filter((m) => m.status === 'open').length,
    closed: messages.filter((m) => m.status === 'closed').length,
  };

  return (
    <div>
      {/* Stat strip */}
      <div className="grid grid-cols-3 border border-line-soft rounded-xl overflow-hidden mb-6">
        {STAT_CELLS.map(({ key, label }, idx) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-5 py-4 text-left transition-colors hover:bg-cream-deep ${statCellBorderClasses(idx, 3)} ${filter === key ? 'bg-cream-deep' : ''}`}
          >
            <div className="text-[26px] font-display font-normal tabular-nums leading-none mb-1">
              {liveCounts[key]}
            </div>
            <div className="text-[11px] tracking-widest uppercase text-muted flex items-center gap-2">
              {label}
              {filter === key && <span className="w-5 h-0.5 bg-oxblood rounded-full inline-block" />}
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full bg-paper border border-line-soft rounded-lg pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-paper border border-dashed border-line rounded-xl p-16 text-center">
          <p className="text-muted text-sm">No messages found.</p>
        </div>
      ) : (
        <div className="bg-paper border border-line-soft rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-soft">
                <th className="text-left px-5 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Customer</th>
                <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Subject</th>
                <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium hidden md:table-cell">Order</th>
                <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {filtered.map((msg) => (
                <tr
                  key={msg.id}
                  className="hover:bg-cream-deep/40 cursor-pointer transition-colors"
                  onClick={() => setDrawer(msg)}
                >
                  {/* Customer */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold shrink-0 ${avatarColorForId(msg.id, AVATAR_COLORS)}`}>
                        {getInitials(msg.customerName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink text-[13px] truncate max-w-35">{msg.customerName}</div>
                        <div className="text-[11px] text-muted truncate max-w-35">{msg.customerEmail}</div>
                      </div>
                    </div>
                  </td>

                  {/* Subject */}
                  <td className="px-4 py-3.5 max-w-50">
                    <span className="text-[13px] text-ink truncate block">{msg.subject}</span>
                  </td>

                  {/* Order ref */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {msg.orderRef ? (
                      <span className="font-mono text-[11px] text-ink-soft bg-cream-deep px-2 py-0.5 rounded">
                        #{msg.orderRef}
                      </span>
                    ) : (
                      <span className="text-muted text-[12px]">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 hidden lg:table-cell text-[12px] text-muted whitespace-nowrap">
                    {relativeTime(msg.createdAt)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${statusPill(msg.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {msg.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => toggleStatus(msg)}
                      disabled={toggling}
                      className="text-[12px] text-muted hover:text-ink border border-line hover:border-ink/30 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {msg.status === 'open' ? 'Close' : 'Re-open'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(null)} aria-hidden="true" />
          <aside className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
              <div className="pr-4">
                <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">Message</div>
                <h2 className="font-display text-[20px] font-normal tracking-tight leading-snug">
                  {drawer.subject}
                </h2>
              </div>
              <button
                onClick={() => setDrawer(null)}
                aria-label="Close"
                className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Meta */}
            <div className="px-6 py-4 border-b border-line-soft shrink-0 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold shrink-0 ${avatarColorForId(drawer.id, AVATAR_COLORS)}`}>
                  {getInitials(drawer.customerName)}
                </div>
                <div>
                  <div className="text-[14px] font-medium text-ink">{drawer.customerName}</div>
                  <a
                    href={`mailto:${drawer.customerEmail}?subject=Re: ${encodeURIComponent(drawer.subject)}`}
                    className="text-[12px] text-muted hover:text-oxblood transition-colors"
                  >
                    {drawer.customerEmail}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[12px] text-muted pt-1">
                <span>{formatDate(drawer.createdAt)}</span>
                {drawer.orderRef && (
                  <span className="font-mono bg-cream-deep text-ink-soft px-2 py-0.5 rounded">
                    #{drawer.orderRef}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusPill(drawer.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {drawer.status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex-1">
              <div className="text-[11px] tracking-widest uppercase text-muted mb-2">Message</div>
              <p className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">{drawer.body}</p>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-5 border-t border-line-soft shrink-0 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => toggleStatus(drawer)}
                disabled={toggling}
                className="w-full py-2.5 text-[13px] font-medium rounded-full border border-ink text-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-50"
              >
                {toggling ? 'Updating…' : drawer.status === 'open' ? 'Mark as closed' : 'Re-open inquiry'}
              </button>
              <a
                href={`mailto:${drawer.customerEmail}?subject=Re: ${encodeURIComponent(drawer.subject)}`}
                className="w-full py-2.5 text-[13px] font-medium rounded-full bg-ink text-cream text-center hover:bg-oxblood transition-colors"
              >
                Reply via email
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
