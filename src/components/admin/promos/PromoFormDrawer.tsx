'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createPromo, updatePromo, deletePromo } from '@/actions/promos';
import { SelectField } from '@/components/ui/SelectField';
import {
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerDeleteConfirm,
} from '@/components/admin/DrawerChrome';
import { labelCls } from '@/components/admin/AdminForm';
import { flattenPromoIssues, promoInputSchema } from '@/lib/promos/schema';
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

// Alias kept because the file references it ~20 times; the value is the
// canonical one so it can no longer drift from every other drawer.
const fieldLabel = `block ${labelCls}`;
const textInput =
  'w-full rounded-sm border border-line bg-cream px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink disabled:opacity-50';
const fieldError = 'mt-1 text-[11px] text-oxblood';

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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const payload = buildPayload();
    // Same schema the server action runs — admins get inline field
    // errors without a round trip when something's malformed.
    const parsed = promoInputSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(flattenPromoIssues(parsed.error.issues));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
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
      <DrawerHeader
        eyebrow={isEdit ? 'Edit promo' : 'New promo'}
        title={isEdit ? promo!.code : 'Create a code'}
        titleId="promo-form-title"
        onClose={onClose}
      />

      <DrawerBody>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-code" className={fieldLabel}>Code</label>
            <input
              id="promo-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GRILLSEASON25"
              required
              className={`${textInput} font-mono tracking-[0.04em]`}
              aria-invalid={errors.code ? true : undefined}
            />
            {errors.code && <p className={fieldError}>{errors.code}</p>}
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
          <label htmlFor="promo-description" className={fieldLabel}>Description (admin only)</label>
          <textarea
            id="promo-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Summer grill kickoff — promotes weekend foot traffic"
            className={textInput}
            aria-invalid={errors.description ? true : undefined}
          />
          {errors.description && <p className={fieldError}>{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-type" className={fieldLabel}>Type</label>
            <SelectField
              id="promo-type"
              value={type}
              onChange={(e) => setType(e.target.value as PromoType)}
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed dollar amount</option>
            </SelectField>
          </div>
          <div>
            <label htmlFor="promo-value" className={fieldLabel}>
              Value {type === 'percent' ? '(%)' : '($)'}
            </label>
            <input
              id="promo-value"
              type="number"
              inputMode="decimal"
              step={type === 'percent' ? 1 : 0.01}
              min={type === 'percent' ? 1 : 0.01}
              max={type === 'percent' ? 100 : undefined}
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              required
              className={textInput}
              aria-invalid={errors.value ? true : undefined}
            />
            {errors.value && <p className={fieldError}>{errors.value}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-min-subtotal" className={fieldLabel}>Minimum subtotal ($)</label>
            <input
              id="promo-min-subtotal"
              type="number"
              inputMode="decimal"
              step={0.01}
              min={0}
              value={minSubtotalStr}
              onChange={(e) => setMinSubtotalStr(e.target.value)}
              placeholder="No minimum"
              className={textInput}
              aria-invalid={errors.minSubtotal ? true : undefined}
            />
            {errors.minSubtotal && <p className={fieldError}>{errors.minSubtotal}</p>}
          </div>
          {type === 'percent' && (
            <div>
              <label htmlFor="promo-max-discount" className={fieldLabel}>Max discount cap ($)</label>
              <input
                id="promo-max-discount"
                type="number"
                inputMode="decimal"
                step={0.01}
                min={0}
                value={maxDiscountStr}
                onChange={(e) => setMaxDiscountStr(e.target.value)}
                placeholder="No cap"
                className={textInput}
                aria-invalid={errors.maxDiscount ? true : undefined}
              />
              {errors.maxDiscount && <p className={fieldError}>{errors.maxDiscount}</p>}
            </div>
          )}
        </div>

        <div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="promo-starts-at" className={fieldLabel}>Starts at</label>
              <input
                id="promo-starts-at"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={textInput}
              />
            </div>
            <div>
              <label htmlFor="promo-ends-at" className={fieldLabel}>Ends at</label>
              <input
                id="promo-ends-at"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className={textInput}
                aria-invalid={errors.endsAt ? true : undefined}
              />
              {errors.endsAt && <p className={fieldError}>{errors.endsAt}</p>}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Times are interpreted in your local timezone.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="promo-usage-limit" className={fieldLabel}>Usage limit (total)</label>
            <input
              id="promo-usage-limit"
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              value={usageLimitStr}
              onChange={(e) => setUsageLimitStr(e.target.value)}
              placeholder="Unlimited"
              className={textInput}
              aria-invalid={errors.usageLimit ? true : undefined}
            />
            {errors.usageLimit && <p className={fieldError}>{errors.usageLimit}</p>}
            {isEdit && !errors.usageLimit && (
              <p className="mt-1 text-[11px] text-muted">
                Used {promo!.usageCount} time{promo!.usageCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="promo-per-customer" className={fieldLabel}>Per-customer limit</label>
            <input
              id="promo-per-customer"
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              value={perCustomerStr}
              onChange={(e) => setPerCustomerStr(e.target.value)}
              className={textInput}
              aria-invalid={errors.perCustomerLimit ? true : undefined}
            />
            {errors.perCustomerLimit && <p className={fieldError}>{errors.perCustomerLimit}</p>}
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
            Excludes points — customer can&apos;t redeem points on the same order
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={excludesMember}
              onChange={(e) => setExcludesMember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-oxblood"
            />
            Excludes member discount — the 5% won&apos;t stack with this code
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
            <p className={`mb-2 ${labelCls}`}>
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
      </DrawerBody>

      <DrawerFooter
        blocker={!code.trim() ? 'Enter a code' : null}
        onCancel={onClose}
        submitType="submit"
        submitLabel={isEdit ? 'Save changes' : 'Create promo'}
        busyLabel="Saving…"
        busy={saving}
        extra={isEdit ? <DrawerDeleteConfirm onDelete={onDelete} disabled={saving} /> : null}
      />
    </form>
  );
}
