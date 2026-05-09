'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export type DeliveryRow = {
  _id: string;
  deliveryDate: string;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'scheduled' | 'received';
};

const DELIVERY_PILL_STYLE: Record<DeliveryRow['status'], string> = {
  confirmed: 'bg-green-soft text-green',
  pending: 'bg-amber-soft text-amber',
  scheduled: 'bg-[rgba(28,24,20,0.06)] text-muted',
  received: 'bg-[rgba(28,24,20,0.06)] text-muted',
};

const DELIVERY_PILL_LABEL: Record<DeliveryRow['status'], string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  scheduled: 'Scheduled',
  received: 'Received',
};

type Props = { deliveries: DeliveryRow[] };

export default function InventoryUpcomingDeliveries({ deliveries }: Props) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);

  const handleMarkReceived = async (id: string) => {
    setMarking(id);
    try {
      const res = await fetch(`/api/deliveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({}));
        toast.error(message ?? 'Failed to mark received');
        return;
      }
      toast.success('Delivery marked as received');
      router.refresh();
    } catch {
      toast.error('Failed to mark received');
    } finally {
      setMarking(null);
    }
  };

  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <div className="mb-6">
        <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
          Upcoming <em className="italic text-oxblood font-normal">deliveries</em>
        </div>
        <div className="text-[12px] text-muted mt-1">Next 14 days from active suppliers</div>
      </div>

      {deliveries.length === 0 ? (
        <p className="text-muted text-[13px] py-8 text-center">No upcoming deliveries scheduled.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line-soft">
          {deliveries.map((d, idx) => {
            const parts = new Intl.DateTimeFormat('en-US', {
              day: '2-digit', month: 'short', weekday: 'short',
              timeZone: 'America/Los_Angeles',
            }).formatToParts(new Date(d.deliveryDate));
            const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
            const day = get('day'), month = get('month'), dow = get('weekday');
            const isMarking = marking === d._id;
            return (
              <div key={d._id} className={`flex flex-col gap-2.5 py-4 ${idx === 0 ? 'pt-0' : ''}`}>
                {/* Status pill + Mark received button */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${DELIVERY_PILL_STYLE[d.status]}`}>
                    {DELIVERY_PILL_LABEL[d.status]}
                  </span>
                  <button
                    type="button"
                    disabled={isMarking}
                    onClick={() => handleMarkReceived(d._id)}
                    className="text-[11px] text-muted hover:text-ink font-mono tracking-[0.04em] transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isMarking ? 'Saving…' : 'Mark received'}
                  </button>
                </div>
                {/* Date + supplier */}
                <div className="grid grid-cols-[56px_1fr] items-start gap-4">
                  <div className="text-center">
                    <div className="font-display text-[22px] font-normal leading-none tracking-tight text-ink">
                      {day}
                    </div>
                    <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{month}</div>
                    <div className="text-[11px] text-muted mt-0.5">{dow}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-medium tracking-tight mb-0.5 leading-snug">
                      {d.supplier}{d.supplierSuffix ? <em className="italic text-oxblood font-normal"> {d.supplierSuffix}</em> : null}
                    </div>
                    <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">{d.detail}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
