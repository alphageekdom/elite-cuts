type Stat = { value: string; label: string };

type CatalogHeroProps = {
  stats: readonly Stat[];
};

const CatalogHero = ({ stats }: CatalogHeroProps) => (
  <section className='bg-cream pt-36 pb-20 md:pt-40 md:pb-24'>
    <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
      <div className='mb-12 flex items-baseline gap-6'>
        <span className='font-display text-sm font-medium text-camel'>
          → 01
        </span>
        <span className='text-xs font-medium tracking-[0.22em] uppercase text-muted'>
          The Shop
        </span>
        <span aria-hidden='true' className='h-px flex-1 bg-line' />
      </div>

      <div className='mb-12 grid items-end gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16'>
        <h1 className='max-w-[10ch] font-display text-[clamp(56px,8vw,120px)] leading-[0.95] tracking-[-0.035em] font-normal'>
          The <em className='font-normal italic text-oxblood'>counter.</em>
        </h1>
        <p className='max-w-[42ch] pb-3 text-[16px] leading-[1.65] text-ink-soft'>
          Browse our full case — fresh today, hand-cut to order. Pickup ready in
          about an hour, or schedule it for whenever suits.
        </p>
      </div>

      <dl className='flex flex-wrap gap-x-12 gap-y-6 border-t border-line-soft pt-8'>
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className='order-2 text-[11px] tracking-[0.22em] uppercase text-muted'>
              {stat.label}
            </dt>
            <dd className='mb-1.5 font-display text-[28px] leading-none tracking-[-0.02em] font-normal'>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default CatalogHero;
