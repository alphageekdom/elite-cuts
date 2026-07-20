import Reveal from '@/components/uielements/Reveal';

import ReviewCard, { type ReviewCardProps } from './ReviewCard';
import SectionEyebrow from './SectionEyebrow';

const REVIEWS: readonly ReviewCardProps[] = [
  {
    variant: 'light',
    quote: (
      <>
        Picked up a bone-in ribeye for our anniversary last month — they
        trimmed it on the spot and walked me through reverse-searing it at
        home.{' '}
        <em className='italic'>Best steak I&apos;ve cooked, hands down.</em>
      </>
    ),
    name: 'Joseph Harmon',
    meta: 'Regular since 2021',
    avatarColor: 'bg-linear-to-br from-oxblood to-oxblood-deep text-cream',
    tier: 'master',
  },
  {
    variant: 'dark',
    quote: (
      <>
        Standing pickup for the dry-aged ribeyes every other Friday. The order
        is always ready when I am, and they remember the trim I like.{' '}
        <em className='italic'>Switched two years ago and never looked back.</em>
      </>
    ),
    name: 'Sonia Park',
    meta: 'Regular since 2023',
    avatarColor: 'bg-linear-to-br from-camel to-[#a07445] text-ink',
    tier: 'connoisseur',
  },
  {
    variant: 'light',
    quote: (
      <>
        Came in for a whole chicken, left with the heritage pork belly on the
        butcher&apos;s recommendation — now I plan my Sundays around it.
      </>
    ),
    name: 'Marcus Webb',
    meta: 'Regular since 2024',
    avatarColor: 'bg-linear-to-br from-[#4a6b3a] to-[#3d5c2a] text-cream',
    tier: 'connoisseur',
  },
] as const;

const Reviews = () => {
  return (
    <section
      aria-labelledby='reviews-heading'
      className='bg-cream-deep pt-25 pb-30'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <SectionEyebrow label='Word from Regulars' />
        </Reveal>

        <Reveal delayMs={80}>
          <h2
            id='reviews-heading'
            className='mb-20 max-w-[16ch] font-display text-[clamp(40px,5vw,68px)] leading-[1.05] tracking-[-0.025em] font-normal'
          >
            What our{' '}
            <em className='font-normal italic text-oxblood'>regulars</em> are
            saying.
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
          {REVIEWS.map((review, i) => (
            <Reveal key={review.name} delayMs={160 + i * 80}>
              <ReviewCard {...review} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
