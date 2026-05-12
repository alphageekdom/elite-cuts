import StoreInfoModal from '@/components/ui/StoreInfoModal';
import { formatGrillHour, type SerializedEvent } from '@/lib/event-config';

type Props = {
  event: SerializedEvent;
};

export default function GrillEventBanner({ event }: Props) {
  const endLabel = formatGrillHour(event.endHour);

  return (
    <section aria-label="Grilling now" className="relative overflow-hidden bg-ink text-cream">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_50%,rgba(168,123,43,0.42)_0%,transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(112,32,36,0.18)_0%,transparent_55%)]"
      />
      <div className="relative mx-auto w-full max-w-7xl px-6 py-4 md:px-8 md:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
            <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] text-camel-soft">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
              </span>
              Grilling now · until {endLabel}
            </span>
            <span className="text-[14px] text-cream/85">
              {event.message}
            </span>
          </div>
          <StoreInfoModal
            label="Visit in‑store →"
            triggerClassName="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[12px] font-medium tracking-[0.04em] text-ink transition-colors duration-300 hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40 md:w-auto md:justify-start"
          />
        </div>
      </div>
    </section>
  );
}
