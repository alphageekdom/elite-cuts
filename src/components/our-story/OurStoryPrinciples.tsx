import SectionHead from '@/components/ui/SectionHead';
import Reveal from '@/components/uielements/Reveal';

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

export default function OurStoryPrinciples() {
  return (
    <section className='px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <SectionHead label='What we stand for' />
        </Reveal>
        <Reveal>
          <h2 className='font-display mb-16 max-w-[16ch] text-[clamp(38px,5vw,60px)] leading-[1.05] font-normal tracking-[-0.025em]'>
            Six rules we don&apos;t{' '}
            <em className='text-oxblood italic'>break.</em>
          </h2>
        </Reveal>

        <div className='border-line-soft grid border-t sm:grid-cols-2 lg:grid-cols-3'>
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.num}>
              <div
                className={[
                  'border-line-soft border-b py-7 sm:py-9',
                  i % 2 === 0 ? 'sm:border-r sm:pr-8' : 'sm:pl-8',
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
                <h3 className='font-display mb-3.5 text-[clamp(22px,4vw,26px)] leading-[1.15] font-medium tracking-[-0.02em]'>
                  {p.title}{' '}
                  <em className='text-oxblood italic'>{p.titleEm}</em>
                </h3>
                <p className='text-ink-soft text-sm leading-[1.65] sm:max-w-[32ch]'>
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
