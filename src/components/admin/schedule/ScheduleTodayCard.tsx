type Props = {
  staffCount: number;
  slotsBooked: number;
  projectedRevenue: number;
  deliveryCount: number;
  openLabel: string;
  /** Shop-local day name + date, resolved on the server. */
  todayLabel: { dayName: string; dateStr: string };
};

export default function ScheduleTodayCard({
  staffCount,
  slotsBooked,
  projectedRevenue,
  deliveryCount,
  openLabel,
  todayLabel,
}: Props) {
  const { dayName, dateStr } = todayLabel;
  const revLabel =
    projectedRevenue >= 1000
      ? `$${(projectedRevenue / 1000).toFixed(1)}K`
      : `$${projectedRevenue.toFixed(0)}`;

  const stats = [
    { v: String(staffCount), unit: 'staff', label: 'On today' },
    { v: String(slotsBooked), unit: 'slots', label: 'Slots booked' },
    { v: revLabel, unit: 'est', label: 'Projected rev' },
    { v: String(deliveryCount), unit: '📦', label: 'Deliveries' },
  ];

  return (
    <div className='bg-ink text-cream relative sm:col-span-2 overflow-hidden rounded p-7 xl:col-span-1'>
      <div className='pointer-events-none absolute -top-24 -right-24 h-65 w-65 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)]' />
      <div className='relative z-2'>
        <div className='text-camel-soft mb-3.5 flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase'>
          <span className='inline-block h-px w-4 bg-current opacity-60' />
          Today
        </div>
        <div className='font-display mb-1.5 text-4xl leading-none font-normal tracking-tight'>
          {dayName}{' '}
          <em className='text-camel-soft ml-1.5 text-xl font-normal italic'>
            {dateStr}
          </em>
        </div>
        <div className='text-cream/65 mb-5 font-mono text-xs tracking-[0.04em]'>
          {openLabel}
        </div>
        <div className='border-cream/10 grid grid-cols-2 gap-3 border-t pt-5'>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className='font-display mb-1 text-2xl leading-none font-normal tracking-tight'>
                {stat.v}
                <em className='text-camel ml-0.5 text-sm font-normal italic'>
                  {stat.unit}
                </em>
              </div>
              <div className='text-cream/60 text-[10px] tracking-[0.18em] uppercase'>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
