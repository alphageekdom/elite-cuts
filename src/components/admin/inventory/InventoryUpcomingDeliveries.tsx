type DeliveryStatus = 'confirmed' | 'pending' | 'scheduled';

const DELIVERIES: {
  id: string;
  day: string;
  month: string;
  dow: string;
  supplier: string;
  supplierEm: string;
  detail: string;
  status: DeliveryStatus;
}[] = [
  { id: 'd1', day: '30', month: 'MAY', dow: 'Fri', supplier: 'Hartwell', supplierEm: 'Ranch', detail: '~120 LB BEEF · WHOLE CARCASS · BI-WEEKLY', status: 'confirmed' },
  { id: 'd2', day: '02', month: 'JUN', dow: 'Mon', supplier: 'Wildwood', supplierEm: 'Farm', detail: '~60 LB PORK · HALF HOG · WEEKLY', status: 'confirmed' },
  { id: 'd3', day: '05', month: 'JUN', dow: 'Thu', supplier: 'Sunridge', supplierEm: 'Farm', detail: '~40 LB POULTRY · 10 WHOLE BIRDS · WEEKLY', status: 'pending' },
  { id: 'd4', day: '07', month: 'JUN', dow: 'Sat', supplier: 'Coastal Lamb', supplierEm: 'Co.', detail: '~35 LB LAMB · 2 WHOLE ANIMALS · BI-WEEKLY', status: 'pending' },
  { id: 'd5', day: '14', month: 'JUN', dow: 'Sat', supplier: 'Hartwell', supplierEm: 'Ranch', detail: '~120 LB BEEF · WHOLE CARCASS · BI-WEEKLY', status: 'scheduled' },
];

const DELIVERY_PILL_STYLE: Record<DeliveryStatus, string> = {
  confirmed: 'bg-green-soft text-green',
  pending: 'bg-amber-soft text-amber',
  scheduled: 'bg-[rgba(28,24,20,0.06)] text-muted',
};

const DELIVERY_PILL_LABEL: Record<DeliveryStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  scheduled: 'Scheduled',
};

export default function InventoryUpcomingDeliveries() {
  return (
    <div className="bg-paper border border-line-soft rounded p-7">
      <div className="mb-6">
        <div className="font-display italic text-[12px] text-camel mb-1">§ 02</div>
        <div className="font-display text-[22px] font-medium tracking-tight leading-snug">
          Upcoming <em className="italic text-oxblood font-normal">deliveries</em>
        </div>
        <div className="text-[12px] text-muted mt-1">Next 14 days from active suppliers</div>
      </div>

      <div className="flex flex-col divide-y divide-line-soft">
        {DELIVERIES.map((d, idx) => (
          <div
            key={d.id}
            className={`grid items-center gap-4 py-4 ${idx === 0 ? 'pt-0' : ''}`}
            style={{ gridTemplateColumns: '64px 1fr auto' }}
          >
            <div className="text-center">
              <div className="font-display text-[26px] font-normal leading-none tracking-tight text-ink">{d.day}</div>
              <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{d.month}</div>
              <div className="text-[11px] text-muted mt-0.5">{d.dow}</div>
            </div>
            <div className="min-w-0">
              <div className="font-display text-[15px] font-medium tracking-tight mb-0.5 leading-snug">
                {d.supplier} <em className="italic text-oxblood font-normal">{d.supplierEm}</em>
              </div>
              <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">{d.detail}</div>
            </div>
            <div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.04em] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${
                  DELIVERY_PILL_STYLE[d.status]
                }`}
              >
                {DELIVERY_PILL_LABEL[d.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
