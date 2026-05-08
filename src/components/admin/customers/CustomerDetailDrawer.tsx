'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatMoney, formatDate, relativeTime, getInitials } from '@/lib/admin-utils';
import type { CustomerTableRow } from '@/types/admin';

export type Tier = 'master' | 'connoisseur' | 'regular';
export type ActivityStatus = 'active' | 'dormant' | 'at-risk' | 'new';

export const TIER_CONFIG: Record<Tier, { label: string; pillClass: string; showStar: boolean }> = {
  master: { label: 'Master Cut', pillClass: 'bg-ink text-camel-soft', showStar: true },
  connoisseur: { label: 'Connoisseur', pillClass: 'bg-camel/20 text-camel', showStar: true },
  regular: { label: 'Regular', pillClass: 'bg-ink/6 text-muted', showStar: false },
};

export const ACTIVITY_CONFIG: Record<ActivityStatus, { label: string; pillClass: string }> = {
  active: { label: 'Active', pillClass: 'bg-green-soft text-green' },
  dormant: { label: 'Dormant', pillClass: 'bg-camel/20 text-camel' },
  'at-risk': { label: 'At risk', pillClass: 'bg-red-soft text-oxblood' },
  new: { label: 'New', pillClass: 'bg-ink text-cream' },
};

export function getTier(orderCount: number): Tier {
  if (orderCount >= 20) return 'master';
  if (orderCount >= 10) return 'connoisseur';
  return 'regular';
}

export function getActivity(row: CustomerTableRow): ActivityStatus {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 86400000;
  const accountAge = now - new Date(row.createdAt).getTime();
  if (accountAge < THIRTY_DAYS) return 'new';
  if (!row.lastOrderAt) return 'at-risk';
  const lastOrderAge = now - new Date(row.lastOrderAt).getTime();
  if (lastOrderAge <= THIRTY_DAYS) return 'active';
  if (lastOrderAge <= 90 * 86400000) return 'dormant';
  return 'at-risk';
}

export function deriveTags(row: CustomerTableRow): Array<{ label: string; cls: string }> {
  const tier = getTier(row.orderCount);
  const activity = getActivity(row);
  const tags: Array<{ label: string; cls: string }> = [];
  if (tier === 'master') tags.push({ label: 'VIP', cls: 'bg-red-soft text-oxblood' });
  if (row.orderCount >= 15) tags.push({ label: 'BULK BUYER', cls: 'bg-green-soft text-green' });
  if (activity === 'new') tags.push({ label: 'FIRST 30 DAYS', cls: 'bg-cream-deep text-ink-soft' });
  if (activity === 'at-risk') tags.push({ label: 'DORMANT', cls: 'bg-cream-deep text-ink-soft' });
  if (row.savedCutsCount > 0) tags.push({ label: 'SAVED CUTS', cls: 'bg-camel/20 text-camel' });
  if (tags.length === 0) tags.push({ label: 'REGULAR', cls: 'bg-cream-deep text-ink-soft' });
  return tags;
}

const inputCls =
  'w-full border border-line bg-paper font-sans text-[14px] text-ink px-4 py-3 rounded-lg outline-none focus:border-ink transition-colors placeholder:text-muted/60';

type Props = {
  customer: CustomerTableRow;
  onClose: () => void;
  onSave: (id: string, data: { name: string; email: string; phone: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export default function CustomerDetailDrawer({ customer, onClose, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editEmail, setEditEmail] = useState(customer.email);
  const [editPhone, setEditPhone] = useState(customer.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteText, setNoteText] = useState(customer.adminNote ?? '');
  const [savingNote, setSavingNote] = useState(false);

  const tier = getTier(customer.orderCount);
  const activity = getActivity(customer);
  const tierCfg = TIER_CONFIG[tier];
  const actCfg = ACTIVITY_CONFIG[activity];
  const initials = getInitials(customer.name);
  const avgOrder = customer.orderCount > 0 ? customer.totalSpend / customer.orderCount : 0;
  const tags = deriveTags(customer);
  const custId = `CUST-${customer.id.slice(-5).toUpperCase()}`;

  async function handleSave() {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    await onSave(customer.id, { name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() });
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(customer.id);
    setDeleting(false);
  }

  return (
    <>
      {/* Hero */}
      <div className="relative bg-ink text-cream px-8 py-8 shrink-0 overflow-hidden">
        <div
          className="absolute -top-[120px] -right-[120px] w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(184,137,90,0.18) 0%, transparent 60%)' }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="font-display italic text-[13px] text-camel mb-1">✦ Customer profile</div>
              <div className="font-mono text-[11px] text-cream/50 tracking-[0.04em]">
                {custId} · MEMBER SINCE {formatDate(customer.createdAt).toUpperCase()}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-cream/15 text-cream grid place-items-center hover:border-cream/30 transition-colors shrink-0"
              style={{ background: 'rgba(244,238,228,0.08)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-[22px] shrink-0">
              {initials}
            </div>
            <div>
              <div className="font-display text-[26px] font-medium tracking-tight leading-tight mb-1">
                {customer.name}
              </div>
              <div className="font-mono text-[12px] text-cream/65 tracking-[0.04em] mb-2.5">
                {customer.email.toUpperCase()}{customer.phone ? ` · ${customer.phone}` : ''}
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-[0.1em] uppercase ${tierCfg.pillClass}`}>
                  {tierCfg.showStar && (
                    <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
                    </svg>
                  )}
                  {tierCfg.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${actCfg.pillClass}`}
                  style={
                    activity === 'active'
                      ? { background: 'rgba(74,107,58,0.25)', color: '#B8DBA8' }
                      : undefined
                  }
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {actCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 pt-5 border-t border-cream/[0.12]">
            <div className="pr-4 border-r border-cream/[0.08]">
              <div className="text-[10px] tracking-[0.18em] uppercase text-cream/50 mb-2">Lifetime spend</div>
              <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
                {formatMoney(customer.totalSpend)}
              </div>
              <div className="font-mono text-[11px] text-cream/50 tracking-[0.04em]">
                {customer.orderCount} ORDER{customer.orderCount !== 1 ? 'S' : ''}
              </div>
            </div>
            <div className="px-4 border-r border-cream/[0.08]">
              <div className="text-[10px] tracking-[0.18em] uppercase text-cream/50 mb-2">Avg order</div>
              <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
                {avgOrder > 0 ? formatMoney(avgOrder) : '—'}
              </div>
              <div className="font-mono text-[11px] text-cream/50 tracking-[0.04em]">PER ORDER</div>
            </div>
            <div className="pl-4">
              <div className="text-[10px] tracking-[0.18em] uppercase text-cream/50 mb-2">Saved cuts</div>
              <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
                {customer.savedCutsCount}
              </div>
              <div className="font-mono text-[11px] text-cream/50 tracking-[0.04em]">FAVOURITES</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* Contact */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Contact</div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-[12px] text-ink-soft border-b border-line hover:text-oxblood transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">Phone</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditing(false); setEditName(customer.name); setEditEmail(customer.email); setEditPhone(customer.phone ?? ''); }}
                  className="flex-1 px-4 py-2.5 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Email',
                  value: customer.email,
                  icon: (
                    <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                    </svg>
                  ),
                },
                {
                  label: 'Phone',
                  value: customer.phone ?? '—',
                  icon: (
                    <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                    </svg>
                  ),
                },
                {
                  label: 'Location',
                  value: customer.defaultCity ?? '—',
                  icon: (
                    <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                  ),
                },
                {
                  label: 'Member since',
                  value: formatDate(customer.createdAt),
                  icon: (
                    <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  ),
                },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-start gap-2.5 p-3 bg-paper border border-line-soft rounded-sm">
                  <div className="text-ink-soft mt-0.5 shrink-0">{icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] tracking-[0.18em] uppercase text-muted mb-0.5">{label}</div>
                    <div className="font-mono text-[12px] text-ink tracking-[0.02em] truncate">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Tags</div>
            <button onClick={() => toast.info('Coming soon')} className="text-[12px] text-ink-soft border-b border-line hover:text-oxblood transition-colors">Manage</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.label}
                className={`inline-flex items-center px-2.5 py-1 rounded-full font-mono text-[10px] tracking-[0.06em] uppercase ${tag.cls}`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* Order history summary */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Order history</div>
            <a href="/dashboard/orders" className="inline-flex items-center gap-1 text-[12px] text-ink-soft border-b border-line hover:text-oxblood transition-colors">
              View all {customer.orderCount}
              <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-3 gap-0 bg-paper border border-line-soft rounded-sm overflow-hidden">
            {[
              { label: 'Orders', value: String(customer.orderCount) },
              { label: 'Total spend', value: formatMoney(customer.totalSpend) },
              { label: 'Last order', value: customer.lastOrderAt ? relativeTime(customer.lastOrderAt) : '—' },
            ].map(({ label, value }, i) => (
              <div key={label} className={`p-4 text-center ${i < 2 ? 'border-r border-line-soft' : ''}`}>
                <div className="font-display text-[18px] font-normal tracking-tight mb-0.5">{value}</div>
                <div className="font-mono text-[10px] text-muted uppercase tracking-[0.1em]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Internal note */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Internal note</div>
            {!noteEditing && (
              <button
                onClick={() => setNoteEditing(true)}
                className="text-[12px] text-ink-soft border-b border-line hover:text-oxblood transition-colors"
              >
                Edit
              </button>
            )}
          </div>
          {noteEditing ? (
            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note…"
                rows={3}
                className={`${inputCls} resize-y`}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setNoteEditing(false); setNoteText(customer.adminNote ?? ''); }}
                  className="flex-1 px-4 py-2 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={savingNote}
                  onClick={async () => {
                    setSavingNote(true);
                    try {
                      const res = await fetch(`/api/users/${customer.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ adminNote: noteText }),
                      });
                      if (!res.ok) {
                        const { message } = await res.json();
                        toast.error(message ?? 'Failed to save note');
                        return;
                      }
                      setNoteEditing(false);
                      toast.success('Note saved');
                    } catch {
                      toast.error('Failed to save note');
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingNote ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 border border-camel/20 rounded-sm font-display italic text-[13px] text-muted leading-relaxed"
              style={{ background: 'rgba(184,137,90,0.08)' }}
            >
              {noteText || 'No notes added yet.'}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
        {confirmDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-ink-soft text-center">
              Delete <strong className="text-oxblood">{customer.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2.5 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-full bg-oxblood text-cream text-[13px] font-medium hover:bg-oxblood/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors"
            >
              Edit profile
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete customer"
              className="w-10 h-10 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
