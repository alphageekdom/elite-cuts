'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatMoney, formatDate, relativeTime, getInitials } from '@/lib/format';
import { useDrawerForm } from '@/hooks/useDrawerForm';
import { inputCls } from '@/components/admin/settings/SettingsUI';
import type { CustomerTableRow } from '@/types/admin';
import { getTier, getActivity, TIER_CONFIG, ACTIVITY_CONFIG, deriveTags } from './customerUtils';
export type { Tier, ActivityStatus } from './customerUtils';
export { TIER_CONFIG, ACTIVITY_CONFIG, getTier, getActivity, deriveTags } from './customerUtils';



type Props = {
  customer: CustomerTableRow;
  onClose: () => void;
  onSave: (id: string, data: { name: string; email: string; phone: string }) => Promise<void>;
  onDelete: (id: string, opts?: { reason?: string; immediate?: boolean }) => Promise<void>;
  onCancelDeletion?: (id: string) => Promise<void>;
  onCancelDormancy?: (id: string) => Promise<void>;
  onSetStaff?: (id: string, value: boolean) => Promise<void>;
};

export default function CustomerDetailDrawer({
  customer,
  onClose,
  onSave,
  onDelete,
  onCancelDeletion,
  onCancelDormancy,
  onSetStaff,
}: Props) {
  const {
    editing, setEditing,
    values: { name: editName, email: editEmail, phone: editPhone },
    setField,
    saving,
    save: saveContact,
    reset: resetContact,
  } = useDrawerForm(
    { name: customer.name, email: customer.email, phone: customer.phone ?? '' },
    async (vals) => onSave(customer.id, { name: vals.name.trim(), email: vals.email.trim(), phone: vals.phone.trim() }),
    '', // parent's onSave already shows the success toast
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteImmediate, setDeleteImmediate] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellingDormancy, setCancellingDormancy] = useState(false);
  const [togglingStaff, setTogglingStaff] = useState(false);
  const isSoftDeleted = Boolean(customer.deletedAt);
  const isDormancyWarned = Boolean(customer.dormancyWarnedAt) && !isSoftDeleted;
  const scheduledForLabel = (() => {
    if (!customer.deletionScheduledFor) return '';
    const d = new Date(customer.deletionScheduledFor);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();
  // Format both the warning date and the scheduled cleanup date (warning + 30d)
  // so the pill can show "sent on X, cleanup on Y".
  const dormancyLabels = (() => {
    if (!customer.dormancyWarnedAt) return { warned: '', cleanup: '' };
    const warned = new Date(customer.dormancyWarnedAt);
    if (Number.isNaN(warned.getTime())) return { warned: '', cleanup: '' };
    const cleanup = new Date(warned.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return { warned: fmt(warned), cleanup: fmt(cleanup) };
  })();
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
    await saveContact();
  }

  async function handleDelete() {
    if (deleteImmediate && !deleteReason.trim()) {
      toast.error('Reason is required for immediate hard delete');
      return;
    }
    setDeleting(true);
    try {
      await onDelete(customer.id, {
        reason: deleteReason.trim() || undefined,
        immediate: deleteImmediate,
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelDeletion() {
    if (!onCancelDeletion) return;
    setCancelling(true);
    try {
      await onCancelDeletion(customer.id);
    } finally {
      setCancelling(false);
    }
  }

  async function handleCancelDormancy() {
    if (!onCancelDormancy) return;
    setCancellingDormancy(true);
    try {
      await onCancelDormancy(customer.id);
    } finally {
      setCancellingDormancy(false);
    }
  }

  async function handleToggleStaff() {
    if (!onSetStaff) return;
    setTogglingStaff(true);
    try {
      await onSetStaff(customer.id, !customer.isStaff);
    } finally {
      setTogglingStaff(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="relative bg-ink text-cream px-8 py-8 shrink-0 overflow-hidden">
        <div className="absolute -top-30 -right-30 w-64 h-64 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)]" />

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
              className="w-9 h-9 rounded-full border border-cream/15 bg-cream/8 text-cream grid place-items-center hover:border-cream/30 transition-colors shrink-0"
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
                {isSoftDeleted && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-oxblood/25 text-cream border border-oxblood/40">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {scheduledForLabel
                      ? `Scheduled for deletion on ${scheduledForLabel}`
                      : 'Scheduled for deletion'}
                  </span>
                )}
                {isDormancyWarned && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-camel/25 text-cream border border-camel/40">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {dormancyLabels.warned && dormancyLabels.cleanup
                      ? `Dormancy warning sent ${dormancyLabels.warned} · cleanup on ${dormancyLabels.cleanup}`
                      : 'Dormancy warning sent'}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase ${tierCfg.pillClass}`}>
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
          <div className="grid grid-cols-3 pt-5 border-t border-cream/12">
            <div className="pr-4 border-r border-cream/8">
              <div className="text-[10px] tracking-[0.18em] uppercase text-cream/50 mb-2">Lifetime spend</div>
              <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
                {formatMoney(customer.totalSpend)}
              </div>
              <div className="font-mono text-[11px] text-cream/50 tracking-[0.04em]">
                {customer.orderCount} ORDER{customer.orderCount !== 1 ? 'S' : ''}
              </div>
            </div>
            <div className="px-4 border-r border-cream/8">
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
                <input type="text" value={editName} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setField('email', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">Phone</label>
                <input type="tel" value={editPhone} onChange={(e) => setField('phone', e.target.value)} placeholder="Optional" className={inputCls} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={resetContact}
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

        {/* Role */}
        {onSetStaff && (
          <div className="pb-6 mb-6 border-b border-line-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted mb-1">Role</div>
                <div className="font-mono text-[12px] text-ink-soft">
                  {customer.isStaff
                    ? 'Appears in the schedule picker'
                    : 'Promote to staff to assign shifts'}
                </div>
              </div>
              <button
                onClick={handleToggleStaff}
                disabled={togglingStaff}
                aria-pressed={customer.isStaff}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium tracking-[0.04em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  customer.isStaff
                    ? 'bg-green text-cream hover:bg-green/90'
                    : 'bg-paper border border-line text-ink-soft hover:border-ink hover:text-ink'
                }`}
              >
                {togglingStaff ? '…' : customer.isStaff ? 'Staff' : 'Mark as staff'}
              </button>
            </div>
          </div>
        )}

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
                <div className="font-mono text-[10px] text-muted uppercase tracking-widest">{label}</div>
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
            <div className="p-4 border border-camel/20 bg-camel/8 rounded-sm font-display italic text-[13px] text-muted leading-relaxed">
              {noteText || 'No notes added yet.'}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div className="px-8 py-4.5 bg-paper border-t border-line-soft shrink-0">
        {confirmDelete ? (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-muted mb-1.5">
                Reason {deleteImmediate && <span className="text-oxblood normal-case tracking-normal">· required</span>}
              </div>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={deleteImmediate ? 'Spam, abuse, fake reviews…' : 'Optional — noted in the audit log'}
                className={`${inputCls} resize-y text-[13px]`}
              />
            </div>
            <label className="flex items-start gap-2.5 text-[13px] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={deleteImmediate}
                onChange={(e) => setDeleteImmediate(e.target.checked)}
                className="mt-0.5 accent-oxblood"
              />
              <span>
                Immediate hard-delete <span className="text-muted">(skip the 30-day grace; permanent)</span>
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmDelete(false); setDeleteReason(''); setDeleteImmediate(false); }}
                className="flex-1 px-4 py-2.5 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (deleteImmediate && !deleteReason.trim())}
                className="flex-1 px-4 py-2.5 rounded-full bg-oxblood text-cream text-[13px] font-medium hover:bg-oxblood/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting
                  ? 'Deleting…'
                  : deleteImmediate
                    ? 'Hard-delete now'
                    : 'Schedule deletion'}
              </button>
            </div>
          </div>
        ) : isSoftDeleted ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancelDeletion}
              disabled={cancelling || !onCancelDeletion}
              className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling…' : 'Cancel deletion'}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete now"
              className="w-10 h-10 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:text-oxblood transition-colors shrink-0"
              title="Delete immediately"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        ) : isDormancyWarned ? (
          <div className="flex gap-2">
            <button
              onClick={handleCancelDormancy}
              disabled={cancellingDormancy || !onCancelDormancy}
              className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingDormancy ? 'Cancelling…' : 'Cancel dormancy cleanup'}
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
