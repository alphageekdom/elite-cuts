import JosephImage from '@/assets/images/joseph.jpg';
import Reveal from '@/components/uielements/Reveal';
import SoniaImage from '@/assets/images/sonia.jpg';

import ReviewCard, { type ReviewCardProps } from './ReviewCard';

const REVIEWS: readonly ReviewCardProps[] = [
  {
    variant: 'light',
    quote: (
      <>
        Absolutely top-notch meat cuts. Every bite is a testament to the quality
        and expertise of EliteCuts. As a local in Southern California, I&apos;m{' '}
        <em className='italic'>fortunate to have such a gem nearby.</em>
      </>
    ),
    name: 'Joseph Doe',
    meta: 'Verified Customer',
    avatar: JosephImage,
  },
  {
    variant: 'dark',
    quote: (
      <>
        EliteCuts&apos; meat cuts are unparalleled. Each piece is tender,
        succulent, and elevates any meal to a gourmet experience.{' '}
        <em className='italic'>I can&apos;t imagine going anywhere else.</em>
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
      className='bg-cream pt-35 pb-30'
    >
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <div className='mb-16 flex items-baseline gap-6'>
            <span className='font-display text-sm font-medium tracking-[0.04em] text-camel'>
              04
            </span>
            <span className='text-xs font-medium tracking-[0.22em] uppercase text-muted'>
              Word from Regulars
            </span>
            <span aria-hidden='true' className='h-px flex-1 bg-line' />
          </div>
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
