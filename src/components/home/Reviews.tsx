import JosephImage from '@/assets/images/joseph.jpg';
import Reveal from '@/components/uielements/Reveal';
import SoniaImage from '@/assets/images/sonia.jpg';

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
        <em className='italic'>
          Best steak I&apos;ve cooked, hands down.
        </em>
      </>
    ),
    name: 'Joseph Doe',
    meta: 'Regular since 2022',
    avatar: JosephImage,
  },
  {
    variant: 'dark',
    quote: (
      <>
        Standing pickup for the dry-aged ribeyes every other Friday. The order
        is always ready when I am, and they remember the trim I like.{' '}
        <em className='italic'>
          Switched two years ago and never looked back.
        </em>
      </>
    ),
    name: 'Sonia Smith',
    meta: 'Verified Customer',
    avatar: SoniaImage,
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
            <em className='font-normal italic text-oxblood'>community</em> is
            saying.
          </h2>
        </Reveal>

        <div className='grid grid-cols-1 items-start gap-8 lg:grid-cols-2'>
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
