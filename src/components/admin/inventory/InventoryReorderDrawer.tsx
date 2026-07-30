'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InventoryRow } from '@/lib/inventory';
import { deliveryCreateSchema } from '@/lib/deliveries/schema';
import { SelectField } from '@/components/ui/SelectField';
import { DrawerHeader, DrawerBody, DrawerFooter } from '@/components/admin/DrawerChrome';

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

    const qty = receivedQty.trim() ? Number.parseInt(receivedQty, 10) : null;
    const payload = {
      deliveryDate: date,
      supplier: supplier.trim(),
      detail: detail.trim(),
      status,
      productId: effectiveProductId,
      ...(status === 'received' && qty !== null && qty >= 0 ? { receivedQty: qty } : {}),
    };

    // Pre-submit `safeParse` mirrors the server-side parse in
    // `/api/deliveries` POST so the admin sees a field-level error
    // (length, status enum, qty cap) before the round trip.
    const parsed = deliveryCreateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid delivery input');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <DrawerHeader
        eyebrow={eyebrow}
        title={headline}
        titleId="reorder-form-title"
        onClose={onClose}
      >
        {row?.deliveryStatus && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-muted">Existing delivery:</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              row.deliveryStatus === 'confirmed' ? 'bg-green-soft text-green' :
              row.deliveryStatus === 'pending'   ? 'bg-amber-soft text-amber' :
              'bg-ink/6 text-muted'
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {row.deliveryStatus.charAt(0).toUpperCase() + row.deliveryStatus.slice(1)}
            </span>
          </div>
        )}
      </DrawerHeader>

      <DrawerBody>
        {!row && isLogDelivery && (
          <div>
            <label htmlFor="reorder-cut" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              Cut
            </label>
            <SelectField
              id="reorder-cut"
              value={productId}
              onChange={(e) => handleProductPick(e.target.value)}
              required
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
            </SelectField>
          </div>
        )}

        <div>
          <label htmlFor="reorder-supplier" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
            Supplier
          </label>
          <input
            id="reorder-supplier"
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
            placeholder="Supplier name"
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="reorder-notes" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
            Notes
          </label>
          <input
            id="reorder-notes"
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="e.g. Reorder: Tomahawk Ribeye"
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="reorder-date" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
            {isLogDelivery ? 'Received on' : 'Expected delivery'}
          </label>
          <input
            id="reorder-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={fieldCls}
          />
        </div>

        <div>
          <label htmlFor="reorder-status" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
            Status
          </label>
          <SelectField
            id="reorder-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="received">Received</option>
          </SelectField>
        </div>

        {status === 'received' && (
          <div>
            <label htmlFor="reorder-qty" className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
              Received qty
            </label>
            <input
              id="reorder-qty"
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

      </DrawerBody>

      <DrawerFooter
        blocker={
          !row && !productId ? 'Pick which cut arrived'
          : !supplier.trim() ? 'Add a supplier'
          : !date ? 'Set a date'
          : null
        }
        onCancel={onClose}
        submitType="submit"
        submitLabel={submitLabel}
        busy={saving}
        disabled={submitDisabled}
      />
    </form>
  );
}
