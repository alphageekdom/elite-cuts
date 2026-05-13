'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InventoryRow } from './InventoryClient';

export type ReorderDrawerMode = 'reorder' | 'log-delivery';

type Props = {
  row: InventoryRow | null;
  mode?: ReorderDrawerMode;
  rows?: InventoryRow[];
  onClose: () => void;
};

type DeliveryStatus = 'scheduled' | 'pending' | 'confirmed' | 'received';

function defaultIsoDate(mode: ReorderDrawerMode): string {
  const d = new Date();
  if (mode === 'reorder') d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function InventoryReorderDrawer({ row, mode = 'reorder', rows = [], onClose }: Props) {
  const router = useRouter();

  const [productId, setProductId] = useState<string>(row?.id ?? '');
  const selectedRow = row ?? rows.find((r) => r.id === productId) ?? null;

  const [supplier, setSupplier] = useState(selectedRow?.supplier ?? '');
  const [detail, setDetail] = useState(
    selectedRow ? `${mode === 'reorder' ? 'Reorder' : 'Received'}: ${selectedRow.name}` : '',
  );
  const [date, setDate] = useState(defaultIsoDate(mode));
  const [status, setStatus] = useState<DeliveryStatus>(
    mode === 'log-delivery'
      ? 'received'
      : (selectedRow?.deliveryStatus as DeliveryStatus) ?? 'scheduled',
  );
  const [receivedQty, setReceivedQty] = useState('');
  const [saving, setSaving] = useState(false);

  // When a product is picked in the log-delivery picker, prefill the supplier
  // and detail fields if they're still untouched.
  function handleProductPick(id: string) {
    setProductId(id);
    const picked = rows.find((r) => r.id === id);
    if (!picked) return;
    setSupplier((prev) => prev.trim() === '' ? picked.supplier ?? '' : prev);
    setDetail((prev) =>
      prev.trim() === '' || /^(Reorder|Received): /.test(prev)
        ? `${mode === 'reorder' ? 'Reorder' : 'Received'}: ${picked.name}`
        : prev,
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const effectiveProductId = row?.id ?? productId;
    if (!date || !supplier.trim() || !effectiveProductId) return;
    setSaving(true);
    try {
      const qty = receivedQty.trim() ? Number.parseInt(receivedQty, 10) : null;
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: date,
          supplier: supplier.trim(),
          detail: detail.trim(),
          status,
          productId: effectiveProductId,
          ...(status === 'received' && qty !== null && qty >= 0 ? { receivedQty: qty } : {}),
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to log delivery');
        return;
      }
      if (status === 'received') {
        toast.success(
          qty && qty > 0
            ? `Delivery logged · +${qty} added to stock`
            : 'Delivery logged',
        );
      } else {
        toast.success('Delivery scheduled');
      }
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to log delivery');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  const isLogDelivery = mode === 'log-delivery';
  const eyebrow = isLogDelivery ? 'Log delivery' : 'Order more';
  const headlineRow = row ?? selectedRow;
  const headline = headlineRow?.name ?? (isLogDelivery ? 'Received delivery' : 'Reorder');
  const submitLabel = saving
    ? isLogDelivery
      ? 'Logging…'
      : 'Scheduling…'
    : isLogDelivery
      ? 'Log delivery'
      : 'Schedule delivery';
  const submitDisabled = saving || !supplier.trim() || !date || (!row && !productId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">{eyebrow}</div>
            <h2 className="font-display text-[20px] font-normal tracking-tight leading-snug">
              {headline}
            </h2>
            {row?.deliveryStatus && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-muted">Existing delivery:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                  row.deliveryStatus === 'confirmed' ? 'bg-green-soft text-green' :
                  row.deliveryStatus === 'pending'   ? 'bg-amber-soft text-amber' :
                  'bg-[rgba(28,24,20,0.06)] text-muted'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {row.deliveryStatus.charAt(0).toUpperCase() + row.deliveryStatus.slice(1)}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-6 py-5 gap-5">
          {!row && isLogDelivery && (
            <div>
              <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
                Cut
              </label>
              <select
                value={productId}
                onChange={(e) => handleProductPick(e.target.value)}
                required
                className={fieldCls}
              >
                <option value="" disabled>Pick a cut…</option>
                {rows
                  .slice()
                  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.category} · {r.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              Supplier
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
              placeholder="Supplier name"
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Reorder: Tomahawk Ribeye"
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              {isLogDelivery ? 'Received on' : 'Expected delivery'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
              className={fieldCls}
            >
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="received">Received</option>
            </select>
          </div>

          {status === 'received' && (
            <div>
              <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
                Received qty
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={receivedQty}
                onChange={(e) => setReceivedQty(e.target.value)}
                placeholder="e.g. 24"
                className={fieldCls}
              />
              <p className="text-[11px] text-muted mt-1.5">
                Stock count gets bumped by this amount on save.
              </p>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-line-soft">
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
