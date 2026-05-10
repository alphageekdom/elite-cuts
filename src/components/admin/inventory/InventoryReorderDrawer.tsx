'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InventoryRow } from './InventoryClient';

type Props = {
  row: InventoryRow;
  onClose: () => void;
};

type ReorderStatus = 'scheduled' | 'pending' | 'confirmed';

export default function InventoryReorderDrawer({ row, onClose }: Props) {
  const router = useRouter();

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);

  const [supplier, setSupplier] = useState(row.supplier || '');
  const [detail, setDetail] = useState(`Reorder: ${row.name}`);
  const [date, setDate] = useState(defaultDate.toISOString().slice(0, 10));
  const [status, setStatus] = useState<ReorderStatus>(
    (row.deliveryStatus as ReorderStatus) ?? 'scheduled',
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !supplier.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: date,
          supplier: supplier.trim(),
          detail: detail.trim(),
          status,
          productId: row.id,
        }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to create delivery');
        return;
      }
      toast.success('Delivery scheduled');
      onClose();
      router.refresh();
    } catch {
      toast.error('Failed to create delivery');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative bg-paper w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">Order more</div>
            <h2 className="font-display text-[20px] font-normal tracking-tight leading-snug">
              {row.name}
            </h2>
            {row.deliveryStatus && (
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
              Expected delivery
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
              onChange={(e) => setStatus(e.target.value as ReorderStatus)}
              className={fieldCls}
            >
              <option value="scheduled">Scheduled</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </div>

          <div className="mt-auto pt-4 border-t border-line-soft">
            <button
              type="submit"
              disabled={saving || !supplier.trim() || !date}
              className="w-full bg-ink text-cream text-[13px] font-medium tracking-[0.04em] py-3 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Scheduling…' : 'Schedule delivery'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
