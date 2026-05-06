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
    body: 'When everyone was figuring out how to keep operating, we built a proper online ordering system with hand-cut-to-order pickup windows. It\'s still how most of you order today.',
    tag: 'ONLINE ORDERING',
    live: false,
  },
  {
    year: '2021',
    month: 'Sep',
    title: 'Doubled the',
    titleEm: 'floor',
    body: 'Took over the storefront next door. Added a proper aging room (climate-controlled, 28-day capacity), a charcuterie counter, and our second butcher — Marcus, who\'s still here.',
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
    body: 'Nothing pre-cut and shrink-wrapped. You order it, we cut it. The case is full because it has to be — but every steak on your counter was sliced after you walked in.',
  },
  {
    num: '02',
    title: 'Whole-animal',
    titleEm: 'buying',
    body: 'We buy whole animals from the farms we work with, then break them down ourselves. It means the unglamorous cuts get the same care as the ribeyes. Nothing wasted.',
  },
  {
    num: '03',
    title: 'Never',
    titleEm: 'frozen',
    body: "If it's in our case, it's been out of refrigeration for less than 36 hours. If it doesn't sell within three days, it goes to the charcuterie counter or our staff fridge. Not the freezer.",
  },
  {
    num: '04',
    title: 'Source you',
    titleEm: 'can name',
    body: 'Every cut in the case can be traced to the farm or ranch it came from. Ask any of us — we\'ll tell you the name, the town, and what they fed the animal.',
  },
  {
    num: '05',
    title: 'Honest',
    titleEm: 'pricing',
    body: "We charge what good meat costs. We don't run loss-leader specials, we don't mark things up to mark them down. The price you see is the price.",
  },
  {
    num: '06',
    title: 'Teach the',
    titleEm: 'technique',
    body: 'You spent $90 on a tomahawk. We\'re not going to let you cook it wrong. Every order ships with cooking notes, and the team at the counter will walk you through any cut.',
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
    bio: "Former chef de cuisine, now spends most of her week visiting farms. Knows every rancher we buy from by their dog's name.",
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
    body: 'Heritage Berkshire pork, pasture-raised on 80 acres of oak savannah. The hogs forage acorns most of the year — it\'s why the fat tastes the way it does.',
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
    eyebrow: 'Lamb · Since 2022',
    title: 'Coastal',
    titleEm: 'Lamb Co.',
    body: 'Grass-fed Dorset lamb from rolling coastal pasture. Smaller carcasses than typical, sweeter flavor from the salt-air grass. We get a delivery every other Wednesday.',
    meta: 'CENTRAL COAST · 2.2HR DRIVE',
    img: '/images/our-story/partner-coastal-lamb.jpg',
    stats: [
      { v: '100', unit: '%', label: 'Grass-fed' },
      { v: '14', unit: 'day', label: 'Delivery cycle' },
      { v: 'Dorset', unit: '', label: 'Single breed' },
    ],
    flip: false,
  },
];

// ─── Shared section header ────────────────────────────────────────────────────
function SectionHead({ num, label }: { num: string; label: string }) {
  return (
    <div className='mb-14 flex items-baseline gap-6'>
      <span className='font-mono text-sm font-medium text-camel'>{num}</span>
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
      <section className='px-4 pt-18 pb-12 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <p className='mb-8 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted before:h-px before:w-7 before:bg-current before:opacity-50'>
              Our Story · Est. 2018
            </p>
          </OurStoryReveal>

          <OurStoryReveal>
            <h1 className='font-display mb-0 max-w-[12ch] text-[clamp(52px,9vw,140px)] font-normal leading-[0.92] tracking-[-0.04em]'>
              A neighborhood <em className='italic text-oxblood'>butcher</em>{' '}
              shop, modernized.
            </h1>
          </OurStoryReveal>

          <div className='mt-8 grid gap-16 border-t border-line-soft pt-8 lg:grid-cols-[1fr_1.4fr]'>
            <OurStoryReveal>
              <div className='font-mono text-[11px] leading-[1.8] tracking-[0.04em] text-muted'>
                <p><strong className='text-ink'>Founded</strong> 2018</p>
                <p><strong className='text-ink'>Location</strong> Grillville, CA</p>
                <p><strong className='text-ink'>Counter</strong> 6 staff</p>
                <p><strong className='text-ink'>Sourcing</strong> 6+ local farms</p>
                <p><strong className='text-ink'>Aging room</strong> 28 days, climate-controlled</p>
              </div>
            </OurStoryReveal>
            <OurStoryReveal>
              <p className='font-display max-w-[44ch] text-[19px] font-normal leading-[1.55] tracking-[-0.005em] text-ink-soft'>
                We started with one rule —{' '}
                <em className='italic text-oxblood'>
                  don&apos;t sell anything you wouldn&apos;t cook for your own family.
                </em>{' '}
                Eight years later, that&apos;s still the only one we follow without exception.
              </p>
            </OurStoryReveal>
          </div>
        </div>
      </section>

      {/* ── COVER IMAGE ── */}
      <section className='px-4 pb-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <div className='relative aspect-[21/9] overflow-hidden rounded-sm bg-ink'>
              <Image
                src='/images/our-story/shop-cover.jpg'
                alt='EliteCuts shop interior, est. 2018'
                fill
                className='object-cover contrast-[1.04] saturate-[0.92]'
                sizes='(max-width: 768px) 100vw, 90vw'
                priority
              />
              <div className='absolute bottom-6 left-7 inline-flex items-center gap-2.5 rounded-full bg-ink/65 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-cream backdrop-blur-sm before:h-px before:w-4 before:bg-camel before:opacity-80'>
                The shop · Grillville, March 2018
              </div>
            </div>
          </OurStoryReveal>
        </div>
      </section>

      {/* ── ORIGIN STORY ── */}
      <section className='px-4 pb-24 sm:px-8 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <OurStoryReveal>
            <SectionHead num='§ 01' label='How it started' />
          </OurStoryReveal>

          <div className='grid gap-20 lg:grid-cols-[1fr_1.4fr]'>
            {/* Aside */}
            <OurStoryReveal>
              <aside>
                <h3 className='font-display mb-4 text-[22px] font-normal italic leading-[1.2] tracking-[-0.01em] text-oxblood'>
                  Started with one tomahawk and a lot of optimism.
                </h3>
                <p className='mb-4 max-w-[32ch] text-sm leading-[1.65] text-ink-soft'>
                  Tangelo had been a head butcher at a Beverly Hills steakhouse for nine years. The kitchen was busy. The work was good. But the cuts that ended up on $90 plates were getting lost in translation by the time they reached customers&apos; kitchens at home.
                </p>
                <p className='mb-5 max-w-[32ch] text-sm leading-[1.65] text-ink-soft'>
                  So in March 2018, he opened a 600-square-foot shop on Carnivore Street with a single dry-aging cabinet and a whiteboard menu.
                </p>
                <div className='flex items-baseline gap-3 rounded-sm border border-line-soft bg-paper p-5'>
                  <div>
                    <div className='font-display text-[32px] font-normal leading-none tracking-[-0.025em]'>
                      600<em className='ml-0.5 text-[16px] font-normal not-italic text-oxblood'>sqft</em>
                    </div>
                    <div className='mt-1 text-[11px] uppercase tracking-[0.18em] text-muted'>
                      Original shop size
                    </div>
                  </div>
                </div>
              </aside>
            </OurStoryReveal>

            {/* Main text */}
            <OurStoryReveal>
              <div>
                <h2 className='font-display mb-8 max-w-[18ch] text-[clamp(34px,4.5vw,52px)] font-normal leading-[1.05] tracking-[-0.025em]'>
                  The first month, we sold{' '}
                  <em className='italic text-oxblood'>twelve cuts.</em>
                </h2>
                <p className='mb-5 max-w-[56ch] text-base leading-[1.75] text-ink-soft first-letter:float-left first-letter:mr-3.5 first-letter:mt-1.5 first-letter:font-display first-letter:text-[64px] first-letter:font-medium first-letter:leading-[0.9] first-letter:text-oxblood'>
                  Not twelve a day. Twelve total. Tangelo kept the lights on by working nights at his old kitchen and letting the dry-aging cabinet earn its keep slowly — every steak that came out of it took 28 days, and there was no shortcut for that.
                </p>
                <p className='mb-5 max-w-[56ch] text-base leading-[1.75] text-ink-soft'>
                  Word started moving when chefs at neighboring restaurants began stopping by on their days off. They knew what dry-aged ribeye was supposed to taste like, and they were finding it within walking distance instead of having to drive to the meatpacking district. They told their friends. Their friends told their friends.
                </p>
                <blockquote className='font-display my-9 max-w-[36ch] border-l-2 border-camel py-2 pl-7 text-[clamp(22px,2.6vw,32px)] font-normal italic leading-[1.35] tracking-[-0.015em]'>
                  &ldquo;We&apos;re not trying to be the cheapest. We&apos;re trying to be the cut you remember{' '}
                  <em className='text-oxblood'>three weeks later.</em>&rdquo;
                </blockquote>
                <p className='max-w-[56ch] text-base leading-[1.75] text-ink-soft'>
                  By the end of year one, the shop had outgrown the cabinet. By year three, we&apos;d doubled the floor space, hired our second butcher, and started sourcing directly from a single ranch in the Central Valley. We&apos;ve kept growing — but slowly, deliberately, the way you&apos;d age a brisket. The shop today is recognizably the same place. Just with more cuts in the case.
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
            <SectionHead num='§ 02' label='Eight years, in order' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-16 max-w-[16ch] text-[clamp(38px,5vw,60px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              A timeline of <em className='italic text-oxblood'>cuts.</em>
            </h2>
          </OurStoryReveal>

          <div className='relative max-w-[880px]'>
            {/* vertical rule */}
            <div className='absolute top-[18px] bottom-[18px] left-20 w-px bg-line sm:left-20' />

            {MILESTONES.map((m) => (
              <OurStoryReveal key={m.year + m.month}>
                <div className='relative grid grid-cols-[80px_1fr] gap-12 py-6'>
                  {/* dot */}
                  <div
                    className={`absolute left-[76px] top-9 z-10 h-[9px] w-[9px] rounded-full border-2 border-oxblood ${
                      m.live ? 'bg-oxblood shadow-[0_0_0_4px_rgba(107,31,31,0.15)]' : 'bg-cream'
                    }`}
                  />
                  <div className='font-display pt-[18px] text-[22px] font-medium leading-none tracking-[-0.015em]'>
                    {m.year}
                    <em className='ml-1 block text-[13px] font-normal not-italic text-muted'>
                      {m.month}
                    </em>
                  </div>
                  <div className='pt-3.5'>
                    <h3 className='font-display mb-2 text-[22px] font-medium leading-[1.2] tracking-[-0.015em]'>
                      {m.title}{' '}
                      {m.titleEm && (
                        <em className='font-normal italic text-oxblood'>{m.titleEm}</em>
                      )}
                    </h3>
                    <p className='max-w-[50ch] text-[15px] leading-[1.65] text-ink-soft'>
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
            <SectionHead num='§ 03' label='What we stand for' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-16 max-w-[16ch] text-[clamp(38px,5vw,60px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              Six rules we don&apos;t <em className='italic text-oxblood'>break.</em>
            </h2>
          </OurStoryReveal>

          <div className='grid border-t border-line-soft sm:grid-cols-2 lg:grid-cols-3'>
            {PRINCIPLES.map((p, i) => (
              <OurStoryReveal key={p.num}>
                <div
                  className={`border-b border-line-soft py-9 ${
                    (i % 3 === 2) ? 'lg:pr-0 lg:pl-8' :
                    (i % 3 === 0) ? 'lg:pl-0 lg:pr-8 lg:border-r' :
                    'lg:px-8 lg:border-r'
                  } ${
                    (i % 2 === 1) ? 'sm:pl-8' : 'sm:pr-8 sm:border-r'
                  }`}
                >
                  <div className='mb-4 font-mono text-[11px] tracking-[0.06em] text-camel'>
                    PRINCIPLE {p.num}
                  </div>
                  <h3 className='font-display mb-3.5 text-[26px] font-medium leading-[1.15] tracking-[-0.02em]'>
                    {p.title}{' '}
                    <em className='italic text-oxblood'>{p.titleEm}</em>
                  </h3>
                  <p className='max-w-[32ch] text-sm leading-[1.65] text-ink-soft'>
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
            <SectionHead num='§ 04' label='The Counter' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              The people behind <em className='italic text-oxblood'>the case.</em>
            </h2>
          </OurStoryReveal>
          <OurStoryReveal>
            <p className='mb-16 max-w-[50ch] text-base text-ink-soft'>
              When you walk in on a Saturday morning, these are the faces. Most of us have been here longer than three years. All of us will cut you a sample if you ask nicely.
            </p>
          </OurStoryReveal>

          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
            {TEAM.map((member) => (
              <OurStoryReveal key={member.name}>
                <div className='group overflow-hidden rounded-sm border border-line-soft bg-cream transition-transform duration-400 hover:-translate-y-1'>
                  <div className='relative aspect-[3/4] w-full bg-cream-deep'>
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
                    <div className='mb-3.5 text-[11px] uppercase tracking-[0.18em] text-camel'>
                      {member.role}
                    </div>
                    <p className='mb-3.5 text-[13px] leading-[1.55] text-ink-soft'>
                      {member.bio}
                    </p>
                    <p className='border-t border-line-soft pt-3.5 font-display text-[13px] italic leading-[1.5] text-muted'>
                      <strong className='font-medium not-italic text-ink'>Cut of choice:</strong>{' '}
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
            <SectionHead num='§ 05' label='Where it comes from' />
          </OurStoryReveal>
          <OurStoryReveal>
            <h2 className='font-display mb-6 max-w-[16ch] text-[clamp(38px,5vw,60px)] font-normal leading-[1.05] tracking-[-0.025em]'>
              Sources you can <em className='italic text-oxblood'>name.</em>
            </h2>
          </OurStoryReveal>
          <OurStoryReveal>
            <p className='mb-16 max-w-[50ch] text-base text-ink-soft'>
              We don&apos;t work with distributors. Every partner on this list, we&apos;ve visited their land, met their animals, and shaken hands on the deal.
            </p>
          </OurStoryReveal>

          {PARTNERS.map((partner) => (
            <OurStoryReveal key={partner.title}>
              <div
                className={`grid items-center gap-12 border-t border-line-soft py-14 last:border-b last:border-line-soft lg:grid-cols-2 ${
                  partner.flip ? 'lg:[&>:first-child]:order-2 lg:[&>:last-child]:order-1' : ''
                }`}
              >
                {/* Image */}
                <div className='relative'>
                  <div className='relative aspect-[4/3] overflow-hidden rounded-sm'>
                    <Image
                      src={partner.img}
                      alt={`${partner.title} ${partner.titleEm}`}
                      fill
                      className='object-cover contrast-[1.03] saturate-[0.93]'
                      sizes='(max-width: 1024px) 100vw, 50vw'
                    />
                  </div>
                  <div className='absolute bottom-4 left-4 rounded-full bg-cream/95 px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] text-ink backdrop-blur-sm'>
                    {partner.meta}
                  </div>
                </div>
                {/* Text */}
                <div>
                  <div className='mb-4 text-[11px] uppercase tracking-[0.22em] text-camel'>
                    {partner.eyebrow}
                  </div>
                  <h3 className='font-display mb-4 text-[clamp(26px,3vw,38px)] font-medium leading-[1.1] tracking-[-0.02em]'>
                    {partner.title}{' '}
                    <em className='font-normal italic text-oxblood'>{partner.titleEm}</em>
                  </h3>
                  <p className='max-w-[44ch] text-[15px] leading-[1.65] text-ink-soft'>
                    {partner.body}
                  </p>
                  <div className='mt-6 flex gap-8 border-t border-line-soft pt-6'>
                    {partner.stats.map((s) => (
                      <div key={s.label}>
                        <div className='font-display mb-1 text-[22px] font-medium leading-none tracking-[-0.015em]'>
                          {s.v}
                          {s.unit && (
                            <em className='ml-0.5 text-[14px] font-normal not-italic text-oxblood'>
                              {s.unit}
                            </em>
                          )}
                        </div>
                        <div className='text-[10px] uppercase tracking-[0.18em] text-muted'>
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
      <section className='relative overflow-hidden bg-ink px-4 py-20 sm:px-8 lg:px-16'>
        {/* decorative glow */}
        <div className='pointer-events-none absolute -top-36 -right-36 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(184,137,90,0.15)_0%,transparent_60%)]' />
        <div className='relative mx-auto max-w-7xl'>
          <OurStoryReveal>
            <p className='mb-4 text-[11px] uppercase tracking-[0.22em] text-camel'>
              § Eight years, by the numbers
            </p>
            <h2 className='font-display mb-14 max-w-[22ch] text-[clamp(34px,4.5vw,52px)] font-normal leading-[1.05] tracking-[-0.025em] text-cream'>
              The shop in <em className='italic text-camel-soft'>numbers</em> you can verify.
            </h2>
          </OurStoryReveal>

          <div className='grid grid-cols-2 gap-y-10 lg:grid-cols-4'>
            {[
              { v: '28', unit: 'days', label: 'Aging room cycle, climate-controlled' },
              { v: '06', unit: '+', label: 'Local farms in our supply chain' },
              { v: '~36', unit: 'hr', label: 'Max time a cut sits in the case' },
              { v: '100', unit: '%', label: 'Whole-animal buying — nothing pre-cut' },
            ].map((stat, i) => (
              <OurStoryReveal key={stat.label}>
                <div
                  className={`px-8 ${
                    i % 2 !== 0 ? 'lg:border-r-0' : ''
                  } ${i < 3 ? 'border-r border-cream/[0.08]' : ''} ${
                    i === 0 ? 'pl-0' : ''
                  } ${i === 3 ? 'border-r-0 pr-0' : ''}`}
                >
                  <div className='font-display mb-3 text-[clamp(44px,6vw,72px)] font-light leading-none tracking-[-0.035em] text-cream'>
                    {stat.v}
                    <em className='ml-0.5 align-[0.1em] text-[0.5em] font-normal not-italic text-camel'>
                      {stat.unit}
                    </em>
                  </div>
                  <div className='max-w-[22ch] text-[12px] leading-[1.4] tracking-[0.04em] text-cream/65'>
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
            <div className='overflow-hidden rounded-sm border border-line-soft bg-paper lg:grid lg:grid-cols-2'>
              {/* Content */}
              <div className='p-10 lg:p-14'>
                <p className='mb-4 text-[11px] uppercase tracking-[0.22em] text-camel'>
                  § Come say hi
                </p>
                <h2 className='font-display mb-5 max-w-[14ch] text-[clamp(30px,4vw,46px)] font-normal leading-[1.05] tracking-[-0.025em]'>
                  The counter&apos;s <em className='italic text-oxblood'>open.</em>
                </h2>
                <p className='mb-8 max-w-[38ch] text-[15px] leading-[1.65] text-ink-soft'>
                  The best way to get to know what we do is to walk in and ask. No appointment, no obligation — we&apos;ll happily cut you a sample of whatever&apos;s looking good.
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
                          <strong className='font-medium text-ink'>123 Carnivore Street</strong>
                          <br />
                          Grillville, CA 90210
                        </>
                      ),
                    },
                    {
                      icon: <circle cx='12' cy='12' r='10' />,
                      icon2: <polyline points='12 6 12 12 16 14' />,
                      text: (
                        <>
                          <strong className='font-medium text-ink'>Tue–Sat:</strong> 9am–7pm
                          <br />
                          <strong className='font-medium text-ink'>Sun:</strong> 10am–4pm · Closed Mondays
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
                          <strong className='font-medium text-ink'>(555) 123-4567</strong> · Call to reserve a cut
                        </>
                      ),
                    },
                  ].map((row, i) => (
                    <div key={i} className='flex items-start gap-3.5 text-sm text-ink-soft'>
                      <svg
                        className='mt-0.5 h-4 w-4 shrink-0 text-oxblood'
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
                    className='inline-flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-sm font-medium tracking-[0.02em] text-cream transition-colors hover:bg-oxblood'
                  >
                    Browse the shop
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
                      <path d='M5 12h14M13 5l7 7-7 7' />
                    </svg>
                  </a>
                  <a
                    href='#'
                    className='inline-flex items-center gap-2.5 rounded-full border border-line px-6 py-3.5 text-sm font-medium tracking-[0.02em] text-ink-soft transition-colors hover:border-ink hover:bg-cream hover:text-ink'
                  >
                    Get directions
                  </a>
                </div>
              </div>

              {/* Map image */}
              <div className='relative min-h-[280px] bg-cream-deep lg:min-h-0'>
                <Image
                  src='/images/our-story/visit-map.jpg'
                  alt='Map showing EliteCuts location in Grillville, CA'
                  fill
                  className='object-cover contrast-[1.03] saturate-[0.85]'
                  sizes='(max-width: 1024px) 100vw, 50vw'
                />
                {/* EC marker pin */}
                <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full'>
                  <div className='relative grid h-8 w-8 place-items-center rounded-full border-[3px] border-cream bg-oxblood font-display text-[11px] font-bold text-cream shadow-[0_8px_20px_rgba(0,0,0,0.25)]'>
                    EC
                    <span className='absolute -bottom-2 left-1/2 -translate-x-1/2 border-x-[6px] border-t-[10px] border-x-transparent border-t-cream' />
                  </div>
                </div>
              </div>
            </div>
          </OurStoryReveal>
        </div>
      </section>
    </>
  );
}
