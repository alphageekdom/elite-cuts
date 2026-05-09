export type DeliveryRow = {
  _id: string;
  deliveryDate: string;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: 'confirmed' | 'pending' | 'scheduled';
};

const DELIVERY_PILL_STYLE: Record<DeliveryRow['status'], string> = {
  confirmed: 'bg-green-soft text-green',
  pending: 'bg-amber-soft text-amber',
  scheduled: 'bg-[rgba(28,24,20,0.06)] text-muted',
};

const DELIVERY_PILL_LABEL: Record<DeliveryRow['status'], string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  scheduled: 'Scheduled',
};

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DOW_ABBR = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

type Props = { deliveries: DeliveryRow[] };

export default function InventoryUpcomingDeliveries({ deliveries }: Props) {
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
            const date = new Date(d.deliveryDate);
            return (
              <div key={d._id} className={`grid items-center gap-4 py-4 ${idx === 0 ? 'pt-0' : ''}`} style={{ gridTemplateColumns: '64px 1fr auto' }}>
                <div className="text-center">
                  <div className="font-display text-[26px] font-normal leading-none tracking-tight text-ink">
                    {String(date.getDate()).padStart(2, '0')}
                  </div>
                  <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-muted mt-0.5">{MONTH_ABBR[date.getMonth()]}</div>
                  <div className="text-[11px] text-muted mt-0.5">{DOW_ABBR[date.getDay()]}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-medium tracking-tight mb-0.5 leading-snug">
                    {d.supplier}{d.supplierSuffix ? <em className="italic text-oxblood font-normal"> {d.supplierSuffix}</em> : null}
                  </div>
                  <div className="font-mono text-[11px] text-muted tracking-[0.04em] leading-relaxed">{d.detail}</div>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.04em] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${DELIVERY_PILL_STYLE[d.status]}`}>
                    {DELIVERY_PILL_LABEL[d.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
