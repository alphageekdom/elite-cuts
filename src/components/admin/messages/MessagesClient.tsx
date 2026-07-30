'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import AdminSearchInput from '@/components/admin/AdminSearchInput';
import AdminStatStrip, { type StatCell } from '@/components/admin/AdminStatStrip';
import SlideDrawer from '@/components/admin/SlideDrawer';
import { DRAWER_WIDTH } from '@/components/admin/DrawerChrome';
import { useAdminDrawer } from '@/hooks/admin/useAdminDrawer';
import { useStatFilter } from '@/hooks/admin/useStatFilter';

import type { MessageStatus } from '@/lib/messages/constants';
import { type MessageRow } from '@/lib/admin/messages';
import MessageCard from './MessageCard';
import MessageDrawer from './MessageDrawer';
import MessageTableRow from './MessageTableRow';

// Re-export so existing sibling imports (MessageCard, MessageTableRow,
// MessageDrawer, the server page) keep their paths stable.
export type { MessageRow };

type Filter = 'all' | 'open' | 'closed';

export default function MessagesClient({
  messages: initialMessages,
}: {
  messages: MessageRow[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const { activeKey: filter, selectKey: setFilter } = useStatFilter<Filter>('all');
  const [search, setSearch] = useState('');
  const drawer = useAdminDrawer<MessageRow>();
  const [toggling, setToggling] = useState(false);

  const liveCounts = useMemo(
    () => ({
      all: messages.length,
      open: messages.filter((m) => m.status === 'open').length,
      closed: messages.filter((m) => m.status === 'closed').length,
    }),
    [messages],
  );

  const statCells: StatCell[] = [
    { key: 'all', label: 'All', value: liveCounts.all, meta: 'MESSAGES', dotClass: 'bg-muted' },
    { key: 'open', label: 'Open', value: liveCounts.open, meta: 'AWAITING', dotClass: 'bg-camel' },
    { key: 'closed', label: 'Closed', value: liveCounts.closed, meta: 'RESOLVED', dotClass: 'bg-muted' },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return messages.filter((m) => {
      const matchesFilter = filter === 'all' || m.status === filter;
      const matchesSearch =
        !q ||
        m.customerName.toLowerCase().includes(q) ||
        m.customerEmail.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.orderRef?.toLowerCase().includes(q) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [messages, filter, search]);

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

      // Optimistic update — the open-count in the page subtitle is stale
      // until the next navigation, which is acceptable since the row
      // visibly moves between the Open and Closed filters immediately.
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, status: next } : m)),
      );
      if (drawer.item?.id === msg.id) {
        drawer.setItem((prev) => (prev ? { ...prev, status: next } : prev));
      }
      toast.success(`Marked as ${next}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(false);
    }
  }

  return (
    <div>
      <AdminStatStrip
        cells={statCells}
        activeKey={filter}
        onSelect={(key) => setFilter(key as Filter)}
        cols="grid-cols-3"
        wideBreakpoint="lg"
      />

      <div className="mb-5">
        <AdminSearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search messages…"
          className="w-full sm:max-w-md lg:max-w-xl"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-paper border border-dashed border-line rounded-xl p-16 text-center">
          <p className="text-muted text-sm">No messages found.</p>
        </div>
      ) : (
        <>
          {/* Mobile card list — below sm: the table overflows iPhone widths */}
          <div className="space-y-3 sm:hidden">
            {filtered.map((msg) => (
              <MessageCard
                key={msg.id}
                msg={msg}
                toggling={toggling}
                onOpen={drawer.open}
                onToggleStatus={toggleStatus}
              />
            ))}
          </div>

          {/* Desktop table — sm+ */}
          <div className="hidden sm:block bg-paper border border-line-soft rounded-xl overflow-hidden">
            <div className="overflow-x-auto relative">
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 bg-linear-to-l from-paper z-10" />
              <table className="w-full text-sm min-w-150">
                <thead>
                  <tr className="border-b border-line-soft">
                    <th className="text-left px-5 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Subject</th>
                    <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium hidden md:table-cell">Order</th>
                    <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium hidden lg:table-cell">Date</th>
                    <th className="text-left px-4 py-3 text-[11px] tracking-widest uppercase text-muted font-medium">Status</th>
                    <th className="px-4 py-3" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {filtered.map((msg) => (
                    <MessageTableRow
                      key={msg.id}
                      msg={msg}
                      toggling={toggling}
                      onOpen={drawer.open}
                      onToggleStatus={toggleStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <SlideDrawer
        open={drawer.isOpen}
        onClose={drawer.close}
        widthClass={DRAWER_WIDTH.narrow}
        ariaLabelledBy="message-drawer-title"
      >
        {drawer.item && (
          <MessageDrawer
            message={drawer.item}
            toggling={toggling}
            onClose={drawer.close}
            onToggleStatus={toggleStatus}
          />
        )}
      </SlideDrawer>
    </div>
  );
}
