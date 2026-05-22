'use client';
import { toast } from 'sonner';
import { formatMoney, formatDate, relativeTime } from '@/lib/format';
import { useDrawerForm } from '@/hooks/useDrawerForm';
import { inputCls } from '@/components/admin/settings/SettingsUI';
import type { CustomerTableRow } from '@/types/admin';
import { deriveTags } from './customerUtils';
import CustomerDetailHero from './CustomerDetailHero';
import CustomerDetailFooter from './CustomerDetailFooter';

type Props = {
  customer: CustomerTableRow;
  onClose: () => void;
  onSave: (id: string, data: { name: string; email: string; phone: string }) => Promise<void>;
  onSaveNote: (id: string, adminNote: string) => Promise<void>;
  onDelete: (id: string, opts?: { reason?: string; immediate?: boolean }) => Promise<void>;
  onCancelDeletion?: (id: string) => Promise<void>;
  onCancelDormancy?: (id: string) => Promise<void>;
};

export default function CustomerDetailDrawer({
  customer,
  onClose,
  onSave,
  onSaveNote,
  onDelete,
  onCancelDeletion,
  onCancelDormancy,
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

  const {
    editing: noteEditing,
    setEditing: setNoteEditing,
    values: { adminNote: noteText },
    setField: setNoteField,
    saving: savingNote,
    save: saveNote,
    reset: resetNote,
  } = useDrawerForm(
    { adminNote: customer.adminNote ?? '' },
    async (vals) => onSaveNote(customer.id, vals.adminNote),
    'Note saved',
  );

  const tags = deriveTags(customer);

  async function handleSave() {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    await saveContact();
  }

  return (
    <>
      <CustomerDetailHero customer={customer} onClose={onClose} />

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

        {/* Tags */}
        <div className="pb-6 mb-6 border-b border-line-soft">
          <div className="mb-4 text-[10px] font-medium tracking-[0.22em] uppercase text-muted">Tags</div>
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
                onChange={(e) => setNoteField('adminNote', e.target.value)}
                placeholder="Add an internal note…"
                rows={3}
                className={`${inputCls} resize-y`}
              />
              <div className="flex gap-2">
                <button
                  onClick={resetNote}
                  className="flex-1 px-4 py-2 rounded-full border border-line text-ink-soft text-[13px] font-medium hover:border-ink hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={savingNote}
                  onClick={saveNote}
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

      <CustomerDetailFooter
        customer={customer}
        onDelete={onDelete}
        onCancelDeletion={onCancelDeletion}
        onCancelDormancy={onCancelDormancy}
        onEditProfile={() => setEditing(true)}
      />
    </>
  );
}
