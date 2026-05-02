import Image, { type StaticImageData } from 'next/image';

import type { ReactNode } from 'react';

export type ReviewCardProps = {
  variant: 'light' | 'dark';
  quote: ReactNode;
  name: string;
  meta: string;
  avatar: StaticImageData;
};

const ReviewCard = ({ variant, quote, name, meta, avatar }: ReviewCardProps) => {
  const isDark = variant === 'dark';
  const surface = isDark ? 'bg-ink text-cream lg:mt-10' : 'bg-paper text-ink';
  const reviewerBorder = isDark ? 'border-cream/15' : 'border-ink/10';

  return (
    <article
      className={`relative rounded-sm px-11 py-12 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(28,24,20,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${surface}`}
    >
      <div
        aria-hidden='true'
        className='mb-2 font-display text-[80px] leading-[0.7] text-camel'
      >
        &ldquo;
      </div>
      <div
        aria-hidden='true'
        className='mb-5 text-sm tracking-[2px] text-camel'
      >
        ★★★★★
      </div>
      <p className='mb-9 font-display text-[22px] leading-[1.4] tracking-[-0.01em] font-normal'>
        {quote}
      </p>
      <div
        className={`flex items-center gap-4 border-t pt-6 ${reviewerBorder}`}
      >
        <Image
          src={avatar}
          alt={name}
          width={96}
          height={96}
          sizes='48px'
          className='h-12 w-12 shrink-0 rounded-full object-cover'
        />
        <div>
          <div className='mb-0.5 text-[15px] font-semibold'>{name}</div>
          <div className='text-xs tracking-[0.1em] uppercase opacity-60'>
            {meta}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
