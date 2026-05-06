import SectionHead from '@/components/ui/SectionHead';
import OurStoryReveal from './OurStoryReveal';

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

export default function OurStoryTimeline() {
  return (
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
          <div className='bg-line absolute top-[18px] bottom-[18px] left-15 w-px sm:left-18' />

          {MILESTONES.map((m) => (
            <OurStoryReveal key={m.year + m.month}>
              <div className='relative grid grid-cols-[56px_1fr] gap-6 py-6 sm:grid-cols-[72px_1fr] sm:gap-10'>
                <div
                  className={`border-oxblood absolute top-9 left-14.25 z-10 h-2.25 w-2.25 rounded-full border-2 sm:left-17.25 ${
                    m.live
                      ? 'bg-oxblood shadow-[0_0_0_4px_rgba(107,31,31,0.15)]'
                      : 'bg-cream'
                  }`}
                />
                <div className='font-display pt-[18px] text-[18px] leading-none font-medium tracking-[-0.015em] sm:text-[22px]'>
                  {m.year}
                  <em className='text-muted ml-1 block text-[11px] font-normal not-italic sm:text-[13px]'>
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
  );
}
