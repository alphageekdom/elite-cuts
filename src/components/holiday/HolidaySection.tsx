import StoreInfoModal from '@/components/ui/StoreInfoModal';
import Reveal from '@/components/ui/Reveal';
import { formatDaysUntil, getActiveHoliday } from '@/lib/announcements/holidays';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { shopDateKey } from '@/lib/shop-settings/pickup-format';

const titleCaseCut = (slug: string) =>
  slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

export default async function HolidaySection() {
  const { timezone } = await getShopSettings();
  const active = getActiveHoliday(shopDateKey(timezone, new Date()));
  if (!active) return null;

  const { holiday, daysUntil } = active;
  const whenLower = formatDaysUntil(daysUntil).toLowerCase();

  return (
    <section
      aria-labelledby='holiday-section-heading'
      className='relative overflow-hidden bg-ink py-20 text-cream md:py-28'
    >
      <div
        aria-hidden='true'
        className='absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(112,32,36,0.45)_0%,transparent_60%)]'
      />
      <div
        aria-hidden='true'
        className='absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(20,16,14,0.4)_100%)]'
      />

      <div className='relative mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <div className='mb-6 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-camel-soft'>
            <span aria-hidden='true' className='h-px w-7 bg-current opacity-60' />
            {holiday.name} · {formatDaysUntil(daysUntil)}
          </div>
        </Reveal>

        <Reveal delayMs={80}>
          <h2
            id='holiday-section-heading'
            className='mb-7 max-w-[20ch] font-display text-[clamp(40px,5.5vw,72px)] font-normal leading-[1.05] tracking-tight'
          >
            Reserve your{' '}
            <em className='italic text-camel-soft'>{holiday.name}</em>{' '}
            cuts.
          </h2>
        </Reveal>

        <Reveal delayMs={160}>
          <p className='mb-8 max-w-[48ch] text-[clamp(15px,1.5vw,17px)] leading-relaxed text-cream/85'>
            {holiday.name} is {whenLower}. Pre-order at the counter 1–2 weeks
            ahead — premium cuts go fast.
          </p>
        </Reveal>

        {holiday.cuts.length > 0 && (
          <Reveal delayMs={220}>
            <div className='mb-10'>
              <div
                id='holiday-cuts-label'
                className='mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-cream/60'
              >
                What to reserve
              </div>
              <ul aria-labelledby='holiday-cuts-label' className='flex flex-wrap gap-2'>
                {holiday.cuts.map((cut) => (
                  <li
                    key={cut}
                    className='rounded-full border border-cream/20 bg-cream/10 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.18em] uppercase text-cream/90 backdrop-blur-sm'
                  >
                    {titleCaseCut(cut)}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}

        <Reveal delayMs={300}>
          <StoreInfoModal
            label='Visit us in‑store →'
            triggerClassName='inline-flex items-center gap-2.5 rounded-full bg-cream px-7 py-4 text-[14px] font-medium tracking-[0.04em] text-ink transition-colors duration-300 hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40'
          />
        </Reveal>
      </div>
    </section>
  );
}
