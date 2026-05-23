import { formatDeliveryDateParts } from '@/lib/inventory';
import type { ReceivedDeliveryRow } from './InventoryUpcomingDeliveries';

type Props = {
  deliveries: ReceivedDeliveryRow[];
};

export default function DeliveriesReceivedList({ deliveries }: Props) {
  if (deliveries.length === 0) {
    return <p className="text-muted text-[13px] py-8 text-center">No received deliveries recorded yet.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-line-soft">
      {deliveries.map((d, idx) => {
        const { day, month, weekday } = formatDeliveryDateParts(d.receivedAt);
        return (
          <div key={d._id} className={`grid grid-cols-[56px_1fr] items-start gap-4 py-4 ${idx === 0 ? 'pt-0' : ''}`}>
            <div className="text-center">
              <div className="font-display text-[22px] font-normal leading-none tracking-tight text-ink">{day}</div>
              <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{month}</div>
              <div className="text-[11px] text-muted mt-0.5">{weekday}</div>
            </div>
            <div className="min-w-0">
              <div className="font-display text-[15px] font-medium tracking-tight leading-snug mb-0.5">
                {d.supplier}
              </div>
              {d.productName && (
                <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{d.productName}</div>
              )}
              <div className="font-mono text-[11px] text-green mt-1">
                {d.receivedQty !== null ? `+${d.receivedQty} units received` : 'Received'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
