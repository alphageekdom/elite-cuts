'use client';

import { useEffect, useRef, useState } from 'react';

import { FOCUS_RING_DARK } from '@/lib/styles';
import { PARTNER_COUNT } from '@/lib/our-story/partners';
import { CASE_HOURS_MAX } from '@/lib/our-story/standards';

type Milestone = {
  year: string;
  month: string;
  title: string;
  titleEm: string;
  body: string;
  tag: string;
  stats: { value: string; label: string }[];
};

type Props = {
  // Live counts so the closing chapter can't drift from the actual catalog or
  // roster the way the old hardcoded "32 cuts, 6 staff" did.
  cutCount: number;
  staffCount: number;
  // Clock-derived values are resolved on the server and passed in: reading the
  // clock during a client render is impure (and risks a hydration mismatch).
  currentYear: number;
  yearsLabel: string;
};

// Everything before the present-day chapter is fixed storefront history, so it
// stays as written copy. Only the final chapter is built from live data.
//
// The farm names and drive distances quoted in the 2019 and 2023 chapters
// mirror PARTNERS in @/lib/our-story/partners — edit them together, or the
// timeline will disagree with the sourcing section further down the page.
const HISTORY: Milestone[] = [
  {
    year: '2018',
    month: 'Mar',
    title: 'The shop',
    titleEm: 'opens',
    // Deliberately doesn't name the street: the origin section states it from
    // live settings, and a second hardcoded copy here would contradict it the
    // first time an admin edits the address.
    body: '600 square feet, one dry-aging cabinet, and a whiteboard menu that changed every Friday based on what came in.',
    tag: 'YEAR ONE',
    stats: [
      { value: '600 sq ft', label: 'Original floor' },
      { value: '12', label: 'Cuts sold, month one' },
    ],
  },
  {
    year: '2019',
    month: 'Aug',
    title: 'First single-source',
    titleEm: 'partnership',
    body: 'We started buying directly from Hartwell Ranch out in Ramona — the same family-run operation we still source our beef from today. No middleman, no auction floor.',
    tag: 'SINGLE-SOURCE',
    stats: [
      { value: '1 ranch', label: 'Whole-animal supply' },
      { value: '40 mi', label: 'From the counter' },
    ],
  },
  {
    year: '2020',
    month: 'Apr',
    title: 'Pickup,',
    titleEm: 'refined.',
    body: "When everyone was figuring out how to keep operating, we built a proper online ordering system with hand-cut-to-order pickup windows. It's still how most of you order today.",
    tag: 'ONLINE ORDERING',
    stats: [
      { value: 'Order-ahead', label: 'Built in a weekend' },
      { value: 'Same day', label: 'Pickup windows' },
    ],
  },
  {
    year: '2021',
    month: 'Sep',
    title: 'Doubled the',
    titleEm: 'floor',
    body: "Took over the storefront next door. Added a proper aging room (climate-controlled, 28-day capacity), a charcuterie counter, and our second butcher — Marcus, who's still here.",
    tag: 'EXPANSION',
    stats: [
      { value: '1,200 sq ft', label: 'Floor, doubled' },
      { value: '28 days', label: 'In-house aging' },
    ],
  },
  {
    year: '2023',
    month: 'Feb',
    title: 'Heritage pork',
    titleEm: 'added',
    body: 'Partnered with Wildwood Farm for Berkshire pork — pasture-raised up in Julian. Rotating availability, never frozen, always whole-animal.',
    tag: 'HERITAGE PORK',
    stats: [
      { value: 'Berkshire', label: 'Heritage breed' },
      { value: '60 mi', label: 'From the counter' },
    ],
  },
  {
    year: '2024',
    month: 'Nov',
    title: 'Wagyu',
    titleEm: 'allocation',
    body: 'After two years on the waitlist, we secured a small monthly A5 allocation. It arrives irregularly and goes fast — members get first dibs.',
    tag: 'WAGYU',
    stats: [
      { value: 'A5', label: 'Grade' },
      { value: '~1 day', label: 'Time on the case' },
    ],
  },
];

export default function OurStoryTimeline({
  cutCount,
  staffCount,
  currentYear,
  yearsLabel,
}: Props) {
  const present: Milestone = {
    year: String(currentYear),
    month: 'Now',
    title: `${cutCount} cuts,`,
    titleEm: `${staffCount} staff`,
    // The count is already the chapter title and the first stat, so the body
    // carries what those don't rather than saying the number a third time.
    body: `Sourced from ${PARTNER_COUNT} partner farms, hand-cut to order, never sitting more than ${CASE_HOURS_MAX} hours. Same rule as the first week.`,
    tag: 'PRESENT DAY',
    stats: [
      { value: String(cutCount), label: 'Cuts in the case' },
      { value: '1', label: 'Location, still' },
    ],
  };
  const milestones = [...HISTORY, present];

  const [active, setActive] = useState(milestones.length - 1);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement | null>(null);
  const current = milestones[active];

  // The rail overflows on phones and opens on the present-day chapter, which
  // sits at the far right — without this it would load scrolled to 2018 with no
  // tab visibly selected while the panel below reads "Chapter 7 of 7". Measured
  // off bounding rects and applied with scrollBy so only the rail's own axis
  // moves; scrollIntoView would drag the page's vertical scroll with it.
  // Keyboard selection already scrolls via focus(), so this covers pointer use.
  useEffect(() => {
    const rail = railRef.current;
    const tab = tabRefs.current[active];
    if (!rail || !tab) return;
    const railBox = rail.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    if (tabBox.left >= railBox.left && tabBox.right <= railBox.right) return;
    rail.scrollBy({
      left: tabBox.left - railBox.left - (railBox.width - tabBox.width) / 2,
    });
  }, [active]);

  // Roving-tabindex arrow-key navigation, per the WAI tabs pattern: only the
  // selected tab is in the tab order, arrows move between them and take focus.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = milestones.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = active === last ? 0 : active + 1;
    else if (event.key === 'ArrowLeft') next = active === 0 ? last : active - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className='bg-ink text-cream px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <div className='mb-11 flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12'>
          <div>
            <div className='text-camel mb-5 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
              <span aria-hidden className='bg-camel/60 h-px w-7' />
              {yearsLabel}, one block
            </div>
            <h2 className='font-display max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.02] font-normal tracking-tight'>
              A timeline of <em className='text-camel-soft italic'>cuts.</em>
            </h2>
          </div>
          <p className='text-cream/70 max-w-[34ch] text-[15.5px] leading-relaxed md:mb-2'>
            Pick a year. Every one of these started as a conversation across the
            counter.
          </p>
        </div>

        {/* Year rail */}
        <div
          ref={railRef}
          role='tablist'
          aria-label='Shop timeline by year'
          onKeyDown={onKeyDown}
          className='border-cream/16 mb-12 flex overflow-x-auto border-t border-b'
        >
          {milestones.map((m, i) => {
            const selected = i === active;
            return (
              <button
                key={m.year}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type='button'
                role='tab'
                id={`timeline-tab-${i}`}
                aria-selected={selected}
                aria-controls='timeline-panel'
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={`flex min-w-21 flex-1 cursor-pointer flex-col items-center gap-3 px-2 py-5 transition-colors duration-150 motion-reduce:transition-none ${
                  i > 0 ? 'border-cream/10 border-l' : ''
                } ${
                  selected
                    ? 'bg-cream/6 text-cream'
                    : 'text-cream/60 hover:text-cream/90'
                } ${FOCUS_RING_DARK}`}
              >
                <span className='font-display text-[26px] leading-none'>
                  {m.year}
                </span>
                <span
                  aria-hidden
                  className={`h-1.75 w-1.75 rounded-full ${selected ? 'bg-camel-soft' : 'bg-transparent'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Active chapter */}
        {/* Focusable per the WAI tabs pattern: the panel holds no focusable
            content of its own, so without tabIndex a keyboard user tabs
            straight past the chapter into the next section. min-h keeps the
            page below from hopping as chapters of differing length swap in. */}
        <div
          role='tabpanel'
          id='timeline-panel'
          tabIndex={0}
          aria-labelledby={`timeline-tab-${active}`}
          className={`grid grid-cols-1 gap-10 lg:min-h-72 lg:grid-cols-[0.85fr_1fr] lg:gap-16 ${FOCUS_RING_DARK}`}
        >
          <div>
            <div className='flex items-baseline gap-5'>
              <span className='font-display text-camel-soft text-[clamp(56px,9vw,80px)] leading-[0.85] font-medium'>
                {current.year}
              </span>
              <span className='text-cream/50 text-[11.5px] tracking-[0.22em] uppercase'>
                Chapter {active + 1} of {milestones.length}
              </span>
            </div>
            <span className='border-cream/20 text-cream/70 mt-6 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-[0.06em]'>
              {current.tag} · {current.month}
            </span>
          </div>

          <div>
            <h3 className='font-display mb-5 text-[clamp(28px,3.4vw,40px)] leading-[1.1] font-normal tracking-tight'>
              {current.title}{' '}
              <em className='text-camel-soft italic'>{current.titleEm}</em>
            </h3>
            <p className='text-cream/75 mb-8 max-w-[52ch] text-[17px] leading-[1.75]'>
              {current.body}
            </p>
            <div className='border-cream/16 flex gap-11 border-t pt-6'>
              {current.stats.map((s) => (
                <div key={s.label}>
                  <div className='font-display text-cream text-[32px] leading-none'>
                    {s.value}
                  </div>
                  <div className='text-cream/60 mt-2.5 text-[11px] tracking-[0.15em] uppercase'>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
