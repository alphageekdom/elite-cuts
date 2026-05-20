'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { relativeTime } from '@/lib/format';
import DemoModeChip from '@/components/demo/DemoModeChip';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  customers: 'Customers',
  inventory: 'Inventory',
  messages: 'Messages',
  schedule: 'Schedule',
  settings: 'Settings',
  analytics: 'Analytics',
};

type NotificationRow = {
  _id: string;
  type: 'new_order' | 'low_stock';
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const POLL_INTERVAL = 30_000;

type AdminTopbarProps = {
  openMessageCount?: number;
};

export default function AdminTopbar({ openMessageCount = 0 }: AdminTopbarProps) {
  const pathname = usePathname();
  const lastSegment = pathname.split('/').filter(Boolean).pop() ?? '';
  const pageTitle = PAGE_TITLES[lastSegment] ?? 'Dashboard';

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json() as { notifications: NotificationRow[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently ignore — non-critical background poll
    }
  }, []);

  // Initial fetch + 30 s polling. Schedule the initial poll via setTimeout(0)
  // so the setState it ends up triggering is async (rule-clean) rather than a
  // synchronous call from the effect body.
  useEffect(() => {
    const initialId = setTimeout(fetchNotifications, 0);
    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      clearTimeout(initialId);
      clearInterval(intervalId);
    };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  async function markAllRead() {
    setMarking(true);
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarking(false);
    }
  }

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const messagesBadgeLabel = openMessageCount > 9 ? '9+' : String(openMessageCount);

  return (
    <div className="flex items-center justify-between px-5 md:px-10 py-4 md:py-5 gap-4 border-b border-line-soft bg-cream shrink-0">
      {/* Page title */}
      <h1 className="font-display font-medium text-[20px] tracking-[-0.01em] text-ink truncate">
        {pageTitle}
      </h1>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Bell */}
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setOpen((v) => !v)}
            aria-label="Notifications"
            aria-expanded={open}
            className="relative w-10 h-10 rounded-full bg-paper border border-line grid place-items-center text-ink hover:border-ink transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-oxblood text-cream text-[10px] font-medium grid place-items-center px-1 border-2 border-cream">
                {badgeLabel}
              </span>
            )}
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full mt-2 w-80 bg-ink rounded-xl shadow-2xl z-50 overflow-hidden border border-cream/15"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cream/10">
                <span className="font-display text-[15px] font-medium text-cream">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 text-[11px] font-mono text-camel">{unreadCount} new</span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="text-[12px] text-cream/50 hover:text-cream transition-colors disabled:opacity-40"
                  >
                    {marking ? 'Marking…' : 'Mark all read'}
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <svg className="w-8 h-8 text-cream/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    <p className="text-[13px] text-cream/40">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const isUnread = !n.readAt;
                    return (
                      <div
                        key={n._id}
                        className={`flex gap-3 px-4 py-3 border-b border-cream/6 last:border-0 transition-colors ${
                          isUnread ? 'bg-cream/4' : ''
                        }`}
                      >
                        {/* Type icon */}
                        <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5 ${
                          n.type === 'new_order' ? 'bg-green/20 text-green' : 'bg-camel/20 text-camel'
                        }`}>
                          {n.type === 'new_order' ? (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-[13px] font-medium leading-snug ${isUnread ? 'text-cream' : 'text-cream/70'}`}>
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-oxblood shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-[12px] text-cream/50 leading-snug mt-0.5 truncate">{n.body}</p>
                          <p className="font-mono text-[10px] text-cream/30 tracking-[0.04em] mt-1">
                            {relativeTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <DemoModeChip />

        {/* Messages */}
        <div className="relative">
          <Link
            href="/dashboard/messages"
            aria-label={openMessageCount > 0 ? `Messages — ${openMessageCount} open` : 'Messages'}
            className="w-10 h-10 rounded-full bg-paper border border-line grid place-items-center text-ink hover:border-ink transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </Link>
          {openMessageCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-oxblood text-cream text-[10px] font-medium grid place-items-center px-1 border-2 border-cream pointer-events-none">
              {messagesBadgeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
