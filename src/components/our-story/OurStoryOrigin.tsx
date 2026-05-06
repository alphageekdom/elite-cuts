import SectionHead from '@/components/ui/SectionHead';
import OurStoryReveal from './OurStoryReveal';

export default function OurStoryOrigin() {
  return (
    <section className='px-4 pb-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <OurStoryReveal>
          <SectionHead label='How it started' />
        </OurStoryReveal>

        <div className='grid gap-12 lg:gap-20 lg:grid-cols-[1fr_1.4fr]'>
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

          <OurStoryReveal>
            <div>
              <h2 className='font-display mb-8 max-w-[18ch] text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-normal tracking-[-0.025em]'>
                The first month, we sold{' '}
                <em className='text-oxblood italic'>twelve cuts.</em>
              </h2>
              <p className='text-ink-soft first-letter:font-display first-letter:text-oxblood mb-5 max-w-[56ch] text-base leading-[1.75] first-letter:float-left first-letter:mt-1.5 first-letter:mr-3.5 first-letter:text-[clamp(44px,8vw,64px)] first-letter:leading-[0.9] first-letter:font-medium'>
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
  );
}
