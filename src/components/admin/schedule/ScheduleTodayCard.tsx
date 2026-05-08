export default function ScheduleTodayCard() {
  const stats = [
    { v: '4', unit: 'staff', label: 'On today' },
    { v: '18', unit: 'slots', label: 'Slots booked' },
    { v: '$2.1K', unit: 'est', label: 'Projected rev' },
    { v: '1', unit: '📦', label: 'Deliveries' },
  ];

  return (
    <div className="col-span-2 xl:col-span-1 bg-ink text-cream rounded p-7 relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(184,137,90,.18) 0%, transparent 60%)' }}
      />
      <div className="relative z-[2]">
        <div className="text-[10px] tracking-[0.22em] uppercase text-camel-soft mb-3.5 flex items-center gap-2">
          <span className="w-4 h-px bg-current opacity-60 inline-block" />
          Today
        </div>
        <div className="font-display text-4xl font-normal tracking-tight leading-none mb-1.5">
          Wednesday{' '}
          <em className="italic text-camel-soft text-xl font-normal ml-1.5">Apr 30</em>
        </div>
        <div className="font-mono text-xs tracking-[0.04em] mb-5" style={{ color: 'rgba(244,238,228,.65)' }}>
          OPEN 9AM – 7PM · 10 HOURS
        </div>
        <div className="grid grid-cols-2 gap-3 pt-5 border-t" style={{ borderColor: 'rgba(244,238,228,.1)' }}>
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-2xl font-normal tracking-tight leading-none mb-1">
                {stat.v}
                <em className="italic text-camel text-sm font-normal ml-0.5">{stat.unit}</em>
              </div>
              <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: 'rgba(244,238,228,.5)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
