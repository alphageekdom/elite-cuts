import type { UpcomingDelivery } from './ScheduleClient';

function DeliveryIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

type Props = {
  deliveries: UpcomingDelivery[];
};

export default function ScheduleComingUp({ deliveries }: Props) {
  return (
    <div className="bg-paper border border-line-soft rounded p-6">
      <div className="mb-4">
        <span className="font-display text-lg font-medium tracking-tight">
          Coming <em className="italic text-oxblood font-normal">up</em>
        </span>
      </div>
      {deliveries.length === 0 ? (
        <p className="text-[13px] text-muted py-4 text-center">No upcoming deliveries</p>
      ) : (
        <div className="flex flex-col">
          {deliveries.map((d, i) => (
            <div
              key={d.id}
              className={`flex items-start gap-3 py-3 ${i < deliveries.length - 1 ? 'border-b border-line-soft' : ''} ${i === 0 ? 'pt-0' : ''}`}
            >
              <div className="w-8 h-8 rounded-full grid place-items-center shrink-0 mt-px bg-cream-deep text-ink-soft">
                <DeliveryIcon />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm font-medium tracking-tight leading-tight mb-0.5">
                  {d.supplier}{d.supplierSuffix ? ` ${d.supplierSuffix}` : ''} delivery
                </div>
                <div className="font-mono text-[10px] text-muted tracking-[0.04em] leading-relaxed">
                  {d.dateLabel}{d.detail ? ` · ${d.detail}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
