import StoreInfoModal from '@/components/ui/StoreInfoModal';
import { formatDaysUntil, getActiveHoliday } from '@/lib/holidays';
import type { SerializedEvent } from '@/lib/event-config';

import HolidayDismissibleShell from './HolidayDismissibleShell';

type Props = {
  activeEvent?: SerializedEvent | null;
};

export default function HolidayBanner({ activeEvent }: Props) {
  // Yield to a live grill event — same visual treatment, more time-sensitive.
  if (activeEvent) return null;

  const active = getActiveHoliday();
  if (!active) return null;

  const { holiday, date, daysUntil } = active;

  return (
    <HolidayDismissibleShell slug={holiday.slug} year={date.getFullYear()}>
      <section
        aria-label='Holiday pre-order reminder'
        className='relative overflow-hidden bg-ink text-cream'
      >
        <div
          aria-hidden='true'
          className='absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(112,32,36,0.45)_0%,transparent_60%)]'
        />
        <div className='relative mx-auto w-full max-w-7xl px-6 py-5 pr-14 md:px-8 md:py-6 md:pr-16'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8'>
            <div className='flex flex-col gap-2 md:flex-row md:items-center md:gap-6'>
              <div className='flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-camel-soft'>
                <span
                  aria-hidden='true'
                  className='h-px w-7 bg-current opacity-60'
                />
                {holiday.name} · {formatDaysUntil(daysUntil)}
              </div>
              <p className='font-display text-[clamp(22px,2.6vw,32px)] font-normal leading-tight tracking-[-0.01em]'>
                Reserve your{' '}
                <em className='italic text-camel-soft'>{holiday.name}</em>{' '}
                cuts.
              </p>
            </div>
            <StoreInfoModal
              label='Visit in‑store →'
              triggerClassName='inline-flex shrink-0 items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-[13px] font-medium tracking-[0.04em] text-ink transition-colors duration-300 hover:bg-cream-deep'
            />
          </div>
        </div>
      </section>
    </HolidayDismissibleShell>
  );
}
