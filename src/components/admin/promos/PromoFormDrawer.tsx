'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createPromo, updatePromo, deletePromo } from '@/actions/promos';
import { btnPrimary, btnGhost, btnDanger } from '@/components/admin/settings/SettingsUI';
import type { PromoType } from '@/models/Promo';

export type PromoFormRow = {
  id: string;
  code: string;
  description?: string;
  type: PromoType;
  value: number;
  minSubtotalCents: number | null;
  maxDiscountCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  firstOrderOnly: boolean;
  excludesPoints: boolean;
  excludesMember: boolean;
  isActive: boolean;
  isPublic: boolean;
};

type Props = {
  promo: PromoFormRow | null;
  onClose: () => void;
  onSaved: () => void;
};

const dollars = (cents: number | null) => (cents == null ? '' : String(cents / 100));

// Format an ISO string as a `datetime-local` value in the admin's LOCAL
// timezone. The naive `toISOString().slice(0, 16)` shortcut renders the UTC
// time-of-day, which surprises admins outside UTC (e.g. a 10am PT event
// saved as 17:00Z would re-display as 17:00). Building the string manually
// from local-time getters keeps display and intent aligned.
const dateForInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fieldLabel =
  'block text-[11px] font-medium tracking-[0.14em] uppercase text-muted mb-1.5';
const textInput =
  'w-full rounded-sm border border-line bg-cream px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink disabled:opacity-50';

export default function PromoFormDrawer({ promo, onClose, onSaved }: Props) {
  const isEdit = promo != null;
  const [code, setCode] = useState(promo?.code ?? '');
  const [description, setDescription] = useState(promo?.description ?? '');
  const [type, setType] = useState<PromoType>(promo?.type ?? 'percent');
  const [valueStr, setValueStr] = useState(
    promo ? (promo.type === 'percent' ? String(promo.value) : dollars(promo.value)) : '',
  );
  const [minSubtotalStr, setMinSubtotalStr] = useState(dollars(promo?.minSubtotalCents ?? null));
  const [maxDiscountStr, setMaxDiscountStr] = useState(dollars(promo?.maxDiscountCents ?? null));
  const [startsAt, setStartsAt] = useState(dateForInput(promo?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(dateForInput(promo?.endsAt ?? null));
  const [usageLimitStr, setUsageLimitStr] = useState(
    promo?.usageLimit == null ? '' : String(promo.usageLimit),
  );
  const [perCustomerStr, setPerCustomerStr] = useState(String(promo?.perCustomerLimit ?? 1));
  const [firstOrderOnly, setFirstOrderOnly] = useState(promo?.firstOrderOnly ?? false);
  const [excludesPoints, setExcludesPoints] = useState(promo?.excludesPoints ?? true);
  const [excludesMember, setExcludesMember] = useState(promo?.excludesMember ?? false);
  const [isActive, setIsActive] = useState(promo?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(promo?.isPublic ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live preview on two sample order sizes. Matches validatePromo's math
  // minus the member-discount step so admins see the headline savings
  // without having to model membership.
  const preview = useMemo(() => {
    const value = Number(valueStr);
    if (!Number.isFinite(value) || value <= 0) return null;
    const maxDiscountCents = Number(maxDiscountStr) > 0 ? Number(maxDiscountStr) * 100 : null;
    const compute = (subtotalCents: number) => {
      let discountCents: number;
      if (type === 'percent') {
        discountCents = Math.round(subtotalCents * (value / 100));
        if (maxDiscountCents != null) discountCents = Math.min(discountCents, maxDiscountCents);
      } else {
        const valueCents = Math.round(value * 100);
        discountCents = Math.min(valueCents, subtotalCents);
      }
      return discountCents / 100;
    };
    return [
      { label: '$30 order', savings: compute(3000) },
      { label: '$100 order', savings: compute(10000) },
    ];
  }, [type, valueStr, maxDiscountStr]);

  const buildPayload = () => ({
    code: code.trim().toUpperCase(),
    description: description.trim() || undefined,
    type,
    // Percent stays as whole-number percent; fixed converts dollars → cents.
    value: type === 'percent' ? Number(valueStr) : Math.round(Number(valueStr) * 100),
    minSubtotal:
      minSubtotalStr === '' ? null : Math.round(Number(minSubtotalStr) * 100),
    maxDiscount:
      maxDiscountStr === '' ? null : Math.round(Number(maxDiscountStr) * 100),
    startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    usageLimit: usageLimitStr === '' ? null : Number(usageLimitStr),
    perCustomerLimit: Number(perCustomerStr || 1),
    firstOrderOnly,
    excludesPoints,
    excludesMember,
    isActive,
    isPublic,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      const result = isEdit
        ? await updatePromo(promo!.id, payload)
        : await createPromo(payload);
      if (!result.success) {
        toast.error(result.error ?? 'Save failed');
        return;
      }
      toast.success(isEdit ? 'Promo updated' : 'Promo created');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!isEdit) return;
    setSaving(true);
    try {
      const result = await deletePromo(promo!.id);
      if (!result.success) {
        toast.error(result.error ?? 'Delete failed');
        return;
      }
      toast.success('Promo deleted');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-line-soft px-8 py-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">
            → {isEdit ? 'Edit promo' : 'New promo'}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-medium tracking-tight">
            {isEdit ? promo!.code : 'Create a code'}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GRILLSEASON25"
              required
              className={`${textInput} font-mono tracking-[0.04em]`}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-[13px] text-ink-soft">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-oxblood"
              />
              Active
            </label>
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Description (admin only)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Summer grill kickoff — promotes weekend foot traffic"
            className={textInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PromoType)}
              className={textInput}
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed dollar amount</option>
            </select>
          </div>
          <div>
            <label className={fieldLabel}>
              Value {type === 'percent' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step={type === 'percent' ? 1 : 0.01}
              min={type === 'percent' ? 1 : 0.01}
              max={type === 'percent' ? 100 : undefined}
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              required
              className={textInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Minimum subtotal ($)</label>
            <input
              type="number"
              inputMode="decimal"
              step={0.01}
              min={0}
              value={minSubtotalStr}
              onChange={(e) => setMinSubtotalStr(e.target.value)}
              placeholder="No minimum"
              className={textInput}
            />
          </div>
          {type === 'percent' && (
            <div>
              <label className={fieldLabel}>Max discount cap ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                value={maxDiscountStr}
                onChange={(e) => setMaxDiscountStr(e.target.value)}
                placeholder="No cap"
                className={textInput}
              />
            </div>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={fieldLabel}>Starts at</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={textInput}
              />
            </div>
            <div>
              <label className={fieldLabel}>Ends at</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={textInput}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Times are interpreted in your local timezone.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Usage limit (total)</label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              value={usageLimitStr}
              onChange={(e) => setUsageLimitStr(e.target.value)}
              placeholder="Unlimited"
              className={textInput}
            />
            {isEdit && (
              <p className="mt-1 text-[11px] text-muted">
                Used {promo!.usageCount} time{promo!.usageCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div>
            <label className={fieldLabel}>Per-customer limit</label>
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              value={perCustomerStr}
              onChange={(e) => setPerCustomerStr(e.target.value)}
              className={textInput}
            />
          </div>
        </div>

        <div className="space-y-2 rounded-sm border border-line-soft bg-paper px-4 py-3">
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={firstOrderOnly}
              onChange={(e) => setFirstOrderOnly(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-oxblood"
            />
            First order only — refused for any customer with a prior paid order
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={excludesPoints}
              onChange={(e) => setExcludesPoints(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-oxblood"
            />
            Excludes points — customer can't redeem points on the same order
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={excludesMember}
              onChange={(e) => setExcludesMember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-oxblood"
            />
            Excludes member discount — the 5% won't stack with this code
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-oxblood"
            />
            Show on checkout — surface this code as a one-tap chip for everyone
          </label>
        </div>

        {preview && (
          <div className="rounded-sm border border-line-soft bg-cream px-4 py-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Live savings preview
            </p>
            <div className="space-y-1 text-[13px]">
              {preview.map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-ink-soft">{row.label}</span>
                  <span className="font-mono text-green">
                    −${row.savings.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line-soft px-8 py-5">
        <div>
          {isEdit && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
              className={btnDanger}
            >
              Delete
            </button>
          )}
          {isEdit && confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-oxblood">Delete this promo?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={saving}
                className={btnDanger}
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={saving}
                className={btnGhost}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} disabled={saving} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create promo'}
          </button>
        </div>
      </footer>
    </form>
  );
}
