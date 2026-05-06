import type { Metadata } from 'next';
import Image from 'next/image';

import OurStoryReveal from '@/components/our-story/OurStoryReveal';

export const metadata: Metadata = {
  title: 'Our Story | EliteCuts',
  description:
    'A neighborhood butcher shop, modernized. Learn how EliteCuts started and what we stand for.',
};

const MILESTONES = [
  {
    year: '2018',
    month: 'Mar',
    title: 'The shop opens',
    titleEm: '',
    body: '600 square feet on Carnivore Street. One dry-aging cabinet. A whiteboard menu that changed every Friday based on what came in.',
    tag: 'YEAR ONE',
    live: false,
  },
  {
    year: '2019',
    month: 'Aug',
    title: 'First single-source',
    titleEm: 'partnership',
    body: 'We started buying directly from Hartwell Ranch in the Central Valley — the same family-run operation we still source our USDA Prime beef from today. No middleman, no auction floor.',
    tag: 'SINGLE-SOURCE',
    live: false,
  },
  {
    year: '2020',
    month: 'Apr',
    title: 'Pickup,',
    titleEm: 'refined.',
    body: "When everyone was figuring out how to keep operating, we built a proper online ordering system with hand-cut-to-order pickup windows. It's still how most of you order today.",
    tag: 'ONLINE ORDERING',
    live: false,
  },
  {
    year: '2021',
    month: 'Sep',
    title: 'Doubled the',
    titleEm: 'floor',
    body: "Took over the storefront next door. Added a proper aging room (climate-controlled, 28-day capacity), a charcuterie counter, and our second butcher — Marcus, who's still here.",
    tag: 'EXPANSION',
    live: false,
  },
  {
    year: '2023',
    month: 'Feb',
    title: 'Heritage pork',
    titleEm: 'added',
    body: 'Partnered with Wildwood Farm for Berkshire pork — pasture-raised within 90 minutes of the shop. Rotating availability, never frozen, always whole-animal.',
    tag: 'HERITAGE PORK',
    live: false,
  },
  {
    year: '2024',
    month: 'Nov',
    title: 'Wagyu',
    titleEm: 'allocation',
    body: 'After two years on the waitlist, we secured a small monthly A5 allocation from a single Hyogo prefecture distributor. Members get first dibs.',
    tag: 'WAGYU',
    live: false,
  },
  {
    year: '2026',
    month: 'Now',
    title: '32 cuts,',
    titleEm: '6 staff',
    body: 'Today the case holds 32 cuts on a typical day, sourced from six local farms and one ranch. Hand-cut to order, never sitting more than a day. Same rule as the first week.',
    tag: 'PRESENT DAY',
    live: true,
  },
];

const PRINCIPLES = [
  {
    num: '01',
    title: 'Hand-cut',
    titleEm: 'to order',
    body: 'Nothing pre-cut and shrink-wrapped. You order it, we cut it. The case looks full because it has to — but every steak on your counter was sliced after you walked in.',
  },
  {
    num: '02',
    title: 'Whole-animal',
    titleEm: 'buying',
    body: 'We buy whole animals from the farms we work with and break them down ourselves. That means the unglamorous cuts get the same attention as the ribeyes. Nothing wasted.',
  },
  {
    num: '03',
    title: 'Never',
    titleEm: 'frozen',
    body: "If it's in our case, it's been refrigerated — not frozen — and it's been there less than 36 hours. If it doesn't sell within three days, it goes to the charcuterie counter or the staff fridge. Full stop.",
  },
  {
    num: '04',
    title: 'Source you',
    titleEm: 'can name',
    body: "Every cut traces back to the farm or ranch it came from. Ask anyone behind the counter — they'll give you the name, the town, and what the animal ate.",
  },
  {
    num: '05',
    title: 'Honest',
    titleEm: 'pricing',
    body: 'We charge what good meat costs. No loss-leader specials, no markups designed to be marked back down. The price on the tag is the price.',
  },
  {
    num: '06',
    title: 'Teach the',
    titleEm: 'technique',
    body: "You spent $90 on a tomahawk. We're not going to let you cook it wrong. Every order comes with cooking notes, and anyone at the counter will walk you through any cut before you leave.",
  },
];

const TEAM = [
  {
    name: 'Tangelo Doe',
    role: 'Founder · Head Butcher',
    bio: 'Trained at Smith & Wollensky NYC, then nine years as head butcher at a Beverly Hills steakhouse before opening EliteCuts.',
    fact: 'Bone-in côte de boeuf, 28-day aged.',
    img: '/images/our-story/team-tangelo-doe.jpg',
  },
  {
    name: 'Marcus Reyes',
    role: 'Senior Butcher · Charcuterie',
    bio: 'Joined in 2021 from a Lyon-trained background. Runs the charcuterie program — house-cured saucisson, lardo, bresaola.',
    fact: 'Pork shoulder, 12 hours over oak.',
    img: '/images/our-story/team-marcus-reyes.jpg',
  },
  {
    name: 'Elena Huang',
    role: 'Sourcing · Operations',
    bio: "Former chef de cuisine, now spends most of her week on the road visiting farms. Knows every rancher we buy from by their dog's name.",
    fact: 'Skirt steak, hot pan, two minutes a side.',
    img: '/images/our-story/team-elena-huang.jpg',
  },
  {
    name: 'Sam Okafor',
    role: 'Counter · Customer Care',
    bio: 'Started as a Saturday hire in 2022, now runs the front counter on weekends. Will absolutely talk you out of overcooking your wagyu.',
    fact: 'Hanger steak, marinated 24 hours.',
    img: '/images/our-story/team-sam-okafor.jpg',
  },
];

const PARTNERS = [
  {
    eyebrow: 'Beef · Since 2019',
    title: 'Hartwell',
    titleEm: 'Ranch',
    body: 'Family-run since 1962. They raise Black Angus on 4,000 acres of Central Valley grass and finish on a corn-and-barley blend for 120 days. We buy whole carcasses, never less.',
    meta: 'CENTRAL VALLEY · 1.8HR DRIVE',
    img: '/images/our-story/partner-hartwell-ranch.jpg',
    stats: [
      { v: '4,000', unit: 'ac', label: 'Pasture' },
      { v: '120', unit: 'days', label: 'Grain finish' },
      { v: '1962', unit: '', label: 'Family-run since' },
    ],
    flip: false,
  },
  {
    eyebrow: 'Pork · Since 2023',
    title: 'Wildwood',
    titleEm: 'Farm',
    body: "Heritage Berkshire pork, pasture-raised on 80 acres of oak savannah. The hogs forage acorns most of the year. That's why the fat tastes the way it does.",
    meta: 'SAN LUIS OBISPO · 1.5HR DRIVE',
    img: '/images/our-story/partner-wildwood-farm.jpg',
    stats: [
      { v: '80', unit: 'ac', label: 'Oak savannah' },
      { v: '100', unit: '%', label: 'Pasture-raised' },
      { v: '~120', unit: '', label: 'Hogs / year' },
    ],
    flip: true,
  },
  {
    eyebrow: 'Poultry · Since 2021',
    title: 'Sunridge',
    titleEm: 'Farm',
    body: 'Free-range heritage chickens raised on 60 acres of coastal sage scrubland in Ventura County. No antibiotics, no confinement — the birds forage year-round, and the flavor shows it. We take whole-bird delivery every Tuesday and break them down ourselves.',
    meta: 'VENTURA COUNTY · 1.3HR DRIVE',
    img: '/images/our-story/partner-sunridge-farm.jpg',
    stats: [
      { v: '60', unit: 'ac', label: 'Coastal scrubland' },
      { v: '100', unit: '%', label: 'Free-range' },
      { v: '~180', unit: '', label: 'Birds per month' },
    ],
    flip: false,
  },
];


// ─── Shared section header ───────────────────────────────────────────────────
function SectionHead({ label }: { label: string }) {
  return (
    <div className='mb-14 flex items-baseline gap-6'>
      <span className='text-xs font-medium uppercase tracking-[0.22em] text-muted'>
        {label}
      </span>
      <span className='h-px flex-1 bg-line' />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OurStoryPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className='px-4 pt-14 pb-12 sm:pt-18 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <p className='text-muted mb-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase before:h-px before:w-7 before:bg-current before:opacity-50'>
              Our Story · Est. 2018
            </p>
          </OurStoryReveal>

          <OurStoryReveal>
            <h1 className='font-display mb-0 max-w-[12ch] text-[clamp(44px,9vw,140px)] leading-[0.92] font-normal tracking-[-0.04em]'>
              A neighborhood <em className='text-oxblood italic'>butcher</em>{' '}
              shop, modernized.
            </h1>
          </OurStoryReveal>

          <div className='border-line-soft mt-8 grid gap-8 border-t pt-8 lg:gap-16 lg:grid-cols-[1fr_1.4fr]'>
            <OurStoryReveal>
              <div className='text-muted font-mono text-[11px] leading-[1.8] tracking-[0.04em]'>
                <p>
                  <strong className='text-ink'>Founded</strong> 2018
                </p>
                <p>
                  <strong className='text-ink'>Location</strong> San Diego, CA
                </p>
                <p>
                  <strong className='text-ink'>Counter</strong> 6 staff
                </p>
                <p>
                  <strong className='text-ink'>Sourcing</strong> 6+ local farms
                </p>
                <p>
                  <strong className='text-ink'>Aging room</strong> 28 days,
                  climate-controlled
                </p>
              </div>
            </OurStoryReveal>
            <OurStoryReveal>
              <p className='font-display text-ink-soft max-w-[44ch] text-[19px] leading-[1.55] font-normal tracking-[-0.005em]'>
                We started with one rule —{' '}
                <em className='text-oxblood italic'>
                  don&apos;t sell anything you wouldn&apos;t cook for your own
                  family.
                </em>{' '}
                Eight years later, that&apos;s still the only one we follow
                without exception.
              </p>
            </OurStoryReveal>
          </div>
        </div>
      </section>

      {/* ── COVER IMAGE ── */}
      <section className='px-4 pb-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <div className='bg-ink relative aspect-21/9 overflow-hidden rounded-sm'>
              <Image
                src='/images/our-story/shop-cover.jpg'
                alt='EliteCuts shop interior, est. 2018'
                fill
                className='object-cover contrast-[1.04] saturate-[0.92]'
                sizes='(max-width: 768px) 100vw, 90vw'
                priority
              />
              <div className='bg-ink/65 text-cream before:bg-camel absolute bottom-4 left-4 inline-flex items-center gap-2.5 rounded-full px-3.5 py-2 font-mono text-[11px] tracking-[0.18em] uppercase backdrop-blur-sm before:h-px before:w-4 before:opacity-80 sm:bottom-6 sm:left-7'>
                The shop · San Diego, March 2018
              </div>
            </div>
          </OurStoryReveal>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section className='px-4 pb-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead label='How it started' />
          </OurStoryReveal>

          <div className='grid gap-12 lg:gap-20 lg:grid-cols-[1fr_1.4fr]'>
            {/* Aside */}
            <OurStoryReveal>
              <aside>
                <h3 className='font-display text-oxblood mb-4 text-[22px] leading-[1.2] font-normal tracking-[-0.01em] italic'>
                  Started with one tomahawk and a lot of optimism.
                </h3>
                <p className='text-ink-soft mb-4 text-sm leading-[1.65] lg:max-w-[32ch]'>
                  Tangelo spent nine years as head butcher at a Beverly Hills
                  steakhouse. The kitchen was busy. The work was good. But the
                  cuts going out on $90 plates were getting mishandled by the
                  time they hit customers&apos; home kitchens — and that
                  bothered him.
                </p>
                <p className='text-ink-soft mb-5 text-sm leading-[1.65] lg:max-w-[32ch]'>
                  So in March 2018, he signed a lease on a 600-square-foot shop
                  on Carnivore Street, brought in a single dry-aging cabinet,
                  and wrote the menu on a whiteboard.
                </p>
                <div className='border-line-soft bg-paper flex items-baseline gap-3 rounded-sm border p-5'>
                  <div>
                    <div className='font-display text-[32px] leading-none font-normal tracking-[-0.025em]'>
                      600
                      <em className='text-oxblood ml-0.5 text-[16px] font-normal not-italic'>
                        sqft
                      </em>
                    </div>
                    <div className='text-muted mt-1 text-[11px] tracking-[0.18em] uppercase'>
                      Original shop size
                    </div>
                  </div>
                </div>
              </aside>
            </OurStoryReveal>

            {/* Main text */}
            <OurStoryReveal>
              <div>
                <h2 className='font-display mb-8 max-w-[18ch] text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-normal tracking-[-0.025em]'>
                  The first month, we sold{' '}
                  <em className='text-oxblood italic'>twelve cuts.</em>
                </h2>
                <p className='text-ink-soft first-letter:font-display first-letter:text-oxblood mb-5 max-w-[56ch] text-base leading-[1.75] first-letter:float-left first-letter:mt-1.5 first-letter:mr-3.5 first-letter:text-[64px] first-letter:leading-[0.9] first-letter:font-medium'>
                  Not twelve a day. Twelve total. Tangelo kept the lights on by
                  working nights at his old kitchen and letting the dry-aging
                  cabinet earn its keep slowly — every steak that came out of it
                  took 28 days, and there was no shortcut for that.
                </p>
                <p className='text-ink-soft mb-5 max-w-[56ch] text-base leading-[1.75]'>
                  Things shifted when chefs from neighboring restaurants started
                  stopping by on their days off. They knew what dry-aged ribeye
                  was supposed to taste like, and they were finding it within
                  walking distance instead of making the drive to the
                  meatpacking district. They told people. Those people told
                  people.
                </p>
                <blockquote className='font-display border-camel my-9 max-w-[36ch] border-l-2 py-2 pl-7 text-[clamp(22px,2.6vw,32px)] leading-[1.35] font-normal tracking-[-0.015em] italic'>
                  &ldquo;We&apos;re not trying to be the cheapest. We&apos;re
                  trying to be the cut you remember{' '}
                  <em className='text-oxblood'>three weeks later.</em>&rdquo;
                </blockquote>
                <p className='text-ink-soft max-w-[56ch] text-base leading-[1.75]'>
                  By the end of year one, the shop had outgrown the cabinet. By
                  year three, we&apos;d doubled the floor space, hired our
                  second butcher, and started sourcing directly from a single
                  ranch in the Central Valley. We&apos;ve kept growing — but
                  slowly, deliberately, the way you&apos;d age a brisket. The
                  shop today is recognizably the same place. Just with more cuts
                  in the case.
                </p>
              </div>
            </OurStoryReveal>
          </div>
        </div>
      </section>

      {/* ── TIMELINE ── */}
      <section className='bg-cream-deep px-4 py-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead label='Eight years, in order' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-16 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-[-0.025em]'>
              A timeline of <em className='text-oxblood italic'>cuts.</em>
            </h2>
          </OurStoryReveal>

          <div className='relative max-w-[880px]'>
            {/* vertical rule */}
            <div className='bg-line absolute top-[18px] bottom-[18px] left-17 w-px sm:left-20' />

            {MILESTONES.map((m) => (
              <OurStoryReveal key={m.year + m.month}>
                <div className='relative grid grid-cols-[72px_1fr] gap-8 py-6 sm:grid-cols-[80px_1fr] sm:gap-12'>
                  {/* dot */}
                  <div
                    className={`border-oxblood absolute top-9 left-16 z-10 h-2.25 w-2.25 rounded-full border-2 sm:left-19 ${
                      m.live
                        ? 'bg-oxblood shadow-[0_0_0_4px_rgba(107,31,31,0.15)]'
                        : 'bg-cream'
                    }`}
                  />
                  <div className='font-display pt-[18px] text-[22px] leading-none font-medium tracking-[-0.015em]'>
                    {m.year}
                    <em className='text-muted ml-1 block text-[13px] font-normal not-italic'>
                      {m.month}
                    </em>
                  </div>
                  <div className='pt-3.5'>
                    <h3 className='font-display mb-2 text-[22px] leading-[1.2] font-medium tracking-[-0.015em]'>
                      {m.title}{' '}
                      {m.titleEm && (
                        <em className='text-oxblood font-normal italic'>
                          {m.titleEm}
                        </em>
                      )}
                    </h3>
                    <p className='text-ink-soft max-w-[50ch] text-[15px] leading-[1.65]'>
                      {m.body}
                    </p>
                    <span
                      className={`mt-3 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.06em] ${
                        m.live
                          ? 'border-ink bg-ink text-cream'
                          : 'border-line-soft bg-paper text-ink-soft'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                </div>
              </OurStoryReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRINCIPLES ── */}
      <section className='px-4 py-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead label='What we stand for' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-16 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-[-0.025em]'>
              Six rules we don&apos;t{' '}
              <em className='text-oxblood italic'>break.</em>
            </h2>
          </OurStoryReveal>

          <div className='border-line-soft grid border-t sm:grid-cols-2 lg:grid-cols-3'>
            {PRINCIPLES.map((p, i) => (
              <OurStoryReveal key={p.num}>
                <div
                  className={[
                    'border-line-soft border-b py-9',
                    // sm (2-col): even = left col gets right border + right pad; odd = right col gets left pad
                    i % 2 === 0 ? 'sm:border-r sm:pr-8 sm:pl-0' : 'sm:pl-8',
                    // lg (3-col): col positions by modulo-3
                    i % 3 === 0
                      ? 'lg:border-r lg:pr-8 lg:pl-0'
                      : i % 3 === 1
                        ? 'lg:border-r lg:px-8'
                        : 'lg:border-r-0 lg:pl-8 lg:pr-0',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className='text-camel mb-4 font-mono text-[11px] tracking-[0.06em]'>
                    PRINCIPLE {p.num}
                  </div>
                  <h3 className='font-display mb-3.5 text-[26px] leading-[1.15] font-medium tracking-[-0.02em]'>
                    {p.title}{' '}
                    <em className='text-oxblood italic'>{p.titleEm}</em>
                  </h3>
                  <p className='text-ink-soft text-sm leading-[1.65] sm:max-w-[32ch]'>
                    {p.body}
                  </p>
                </div>
              </OurStoryReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className='bg-paper px-4 py-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead label='The Counter' />
          </OurStoryReveal>

          <OurStoryReveal>
            <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-tight'>
              The people behind{' '}
              <em className='text-oxblood italic'>the case.</em>
            </h2>
          </OurStoryReveal>
          <OurStoryReveal>
            <p className='text-ink-soft mb-16 max-w-[50ch] text-base'>
              When you walk in on a Saturday morning, these are the faces. Most
              of us have been here longer than three years. Any of us will cut
              you a sample if you ask.
            </p>
          </OurStoryReveal>

          <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
            {TEAM.map((member) => (
              <OurStoryReveal key={member.name}>
                <div className='group border-line-soft bg-cream overflow-hidden rounded-sm border transition-transform duration-400 hover:-translate-y-1'>
                  <div className='bg-cream-deep relative aspect-3/4 w-full'>
                    <Image
                      src={member.img}
                      alt={member.name}
                      fill
                      className='object-cover contrast-[1.03] saturate-[0.95]'
                      sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'
                    />
                  </div>
                  <div className='p-5 pb-6'>
                    <div className='font-display mb-1 text-[20px] font-medium tracking-[-0.015em]'>
                      {member.name}
                    </div>
                    <div className='text-camel mb-3.5 text-[11px] tracking-[0.18em] uppercase'>
                      {member.role}
                    </div>
                    <p className='text-ink-soft mb-3.5 text-[13px] leading-[1.55]'>
                      {member.bio}
                    </p>
                    <p className='border-line-soft font-display text-muted border-t pt-3.5 text-[13px] leading-normal italic'>
                      <strong className='text-ink font-medium not-italic'>
                        Cut of choice:
                      </strong>{' '}
                      {member.fact}
                    </p>
                  </div>
                </div>
              </OurStoryReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOURCING / PARTNERS ── */}
      <section className='px-4 py-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead label='Where it comes from' />
          </OurStoryReveal>

          <OurStoryReveal>
            <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-tight'>
              Sources you can <em className='text-oxblood italic'>name.</em>
            </h2>
          </OurStoryReveal>
          <OurStoryReveal>
            <p className='text-ink-soft mb-16 max-w-[50ch] text-base'>
              We don&apos;t work with distributors. Every partner on this list —
              we&apos;ve walked their land, met their animals, and shaken hands
              on the deal.
            </p>
          </OurStoryReveal>

          {PARTNERS.map((partner) => (
            <OurStoryReveal key={partner.title}>
              <div
                className={`border-line-soft last:border-line-soft grid items-center gap-12 border-t py-14 last:border-b lg:grid-cols-2 ${
                  partner.flip
                    ? 'lg:*:first:order-2 lg:*:last:order-1'
                    : ''
                }`}
              >
                {/* Image */}
                <div className='relative'>
                  <div className='relative aspect-4/3 overflow-hidden rounded-sm'>
                    <Image
                      src={partner.img}
                      alt={`${partner.title} ${partner.titleEm}`}
                      fill
                      className='object-cover contrast-[1.03] saturate-[0.93]'
                      sizes='(max-width: 1024px) 100vw, 50vw'
                    />
                  </div>
                  <div className='bg-cream/95 text-ink absolute bottom-4 left-4 rounded-full px-3 py-1.5 font-mono text-[10px] tracking-widest backdrop-blur-sm'>
                    {partner.meta}
                  </div>
                </div>
                {/* Text */}
                <div>
                  <div className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
                    {partner.eyebrow}
                  </div>
                  <h3 className='font-display mb-4 text-[clamp(26px,3vw,38px)] leading-[1.1] font-medium tracking-[-0.02em]'>
                    {partner.title}{' '}
                    <em className='text-oxblood font-normal italic'>
                      {partner.titleEm}
                    </em>
                  </h3>
                  <p className='text-ink-soft max-w-[44ch] text-[15px] leading-[1.65]'>
                    {partner.body}
                  </p>
                  <div className='border-line-soft mt-6 flex gap-8 border-t pt-6'>
                    {partner.stats.map((s) => (
                      <div key={s.label}>
                        <div className='font-display mb-1 text-[22px] leading-none font-medium tracking-[-0.015em]'>
                          {s.v}
                          {s.unit && (
                            <em className='text-oxblood ml-0.5 text-[14px] font-normal not-italic'>
                              {s.unit}
                            </em>
                          )}
                        </div>
                        <div className='text-muted text-[10px] tracking-[0.18em] uppercase'>
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </OurStoryReveal>
          ))}
        </div>
      </section>

      {/* ── CRAFT NUMBERS ── */}
      <section className='bg-ink relative overflow-hidden px-4 py-20 sm:px-8 lg:px-16'>
        {/* decorative glow */}
        <div className='pointer-events-none absolute -top-36 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)]' />
        <div className='relative mx-auto max-w-7xl'>
          <OurStoryReveal>
            <p className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
              § Eight years, by the numbers
            </p>
            <h2 className='font-display text-cream mb-14 max-w-[22ch] text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-normal tracking-tight'>
              The shop in <em className='text-camel-soft italic'>numbers</em>{' '}
              you can verify.
            </h2>
          </OurStoryReveal>

          <div className='grid grid-cols-2 gap-y-10 lg:grid-cols-4'>
            {[
              {
                v: '28',
                unit: 'days',
                label: 'Aging room cycle, climate-controlled',
              },
              { v: '06', unit: '+', label: 'Local farms in our supply chain' },
              {
                v: '~36',
                unit: 'hr',
                label: 'Max time a cut sits in the case',
              },
              {
                v: '100',
                unit: '%',
                label: 'Whole-animal buying — nothing pre-cut',
              },
            ].map((stat, i) => (
              <OurStoryReveal key={stat.label}>
                <div
                  className={[
                    'px-4 sm:px-6',
                    // mobile (2-col): left column gets right border; right column doesn't
                    i % 2 === 0 ? 'border-r border-cream/8' : '',
                    // desktop (4-col): first three get right border, last doesn't
                    i < 3 ? 'lg:border-r lg:border-cream/8' : 'lg:border-r-0',
                    // first item: flush left
                    i === 0 ? 'pl-0' : '',
                    // last item: flush right
                    i === 3 ? 'pr-0 lg:pr-0' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className='font-display text-cream mb-3 text-[clamp(44px,6vw,72px)] leading-none font-light tracking-[-0.035em]'>
                    {stat.v}
                    <em className='text-camel ml-0.5 align-[0.1em] text-[0.5em] font-normal not-italic'>
                      {stat.unit}
                    </em>
                  </div>
                  <div className='text-cream/65 max-w-[22ch] text-[12px] leading-[1.4] tracking-[0.04em]'>
                    {stat.label}
                  </div>
                </div>
              </OurStoryReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISIT CTA ── */}
      <section className='px-4 py-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <div className='border-line-soft bg-paper overflow-hidden rounded-sm border lg:grid lg:grid-cols-2'>
              {/* Content */}
              <div className='p-8 lg:p-14'>
                <p className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
                  § Come say hi
                </p>
                <h2 className='font-display mb-5 max-w-[14ch] text-[clamp(30px,4vw,46px)] leading-[1.05] font-normal tracking-tight'>
                  The counter&apos;s{' '}
                  <em className='text-oxblood italic'>open.</em>
                </h2>
                <p className='text-ink-soft mb-8 max-w-[38ch] text-[15px] leading-[1.65]'>
                  The best way to understand what we do is to walk in and ask.
                  No appointment, no obligation — we&apos;ll cut you a sample of
                  whatever&apos;s looking good that day.
                </p>

                <div className='mb-9 flex flex-col gap-4'>
                  {[
                    {
                      icon: (
                        <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
                      ),
                      icon2: <circle cx='12' cy='10' r='3' />,
                      text: (
                        <>
                          <strong className='text-ink font-medium'>
                            3045 30th Street
                          </strong>
                          <br />
                          San Diego, CA 92104
                        </>
                      ),
                    },
                    {
                      icon: <circle cx='12' cy='12' r='10' />,
                      icon2: <polyline points='12 6 12 12 16 14' />,
                      text: (
                        <>
                          <strong className='text-ink font-medium'>
                            Tue–Sat:
                          </strong>{' '}
                          9am–7pm
                          <br />
                          <strong className='text-ink font-medium'>
                            Sun:
                          </strong>{' '}
                          10am–4pm · Closed Mondays
                        </>
                      ),
                    },
                    {
                      icon: (
                        <path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' />
                      ),
                      icon2: null,
                      text: (
                        <>
                          <strong className='text-ink font-medium'>
                            (619) 555-0142
                          </strong>{' '}
                          · Call to reserve a cut
                        </>
                      ),
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className='text-ink-soft flex items-start gap-3.5 text-sm'
                    >
                      <svg
                        className='text-oxblood mt-0.5 h-4 w-4 shrink-0'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        {row.icon}
                        {row.icon2}
                      </svg>
                      <span>{row.text}</span>
                    </div>
                  ))}
                </div>

                <div className='flex flex-wrap gap-3'>
                  <a
                    href='/products'
                    className='bg-ink text-cream hover:bg-oxblood inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-medium tracking-[0.02em] transition-colors'
                  >
                    Browse the shop
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth={2}
                    >
                      <path d='M5 12h14M13 5l7 7-7 7' />
                    </svg>
                  </a>
                  <a
                    href='#'
                    className='border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink inline-flex items-center gap-2.5 rounded-full border px-6 py-3.5 text-sm font-medium tracking-[0.02em] transition-colors'
                  >
                    Get directions
                  </a>
                </div>
              </div>

              {/* Map image */}
              <div className='bg-cream-deep relative min-h-70 lg:min-h-0'>
                <Image
                  src='/images/our-story/visit-map.jpg'
                  alt='Map showing EliteCuts location in San Diego, CA'
                  fill
                  className='object-cover contrast-[1.03] saturate-[0.85]'
                  sizes='(max-width: 1024px) 100vw, 50vw'
                />
              </div>
            </div>
          </OurStoryReveal>
        </div>
      </section>
    </>
  );
}
