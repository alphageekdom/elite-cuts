import type { ReactNode } from 'react';

const TIER_PILL: Record<'master' | 'connoisseur', string> = {
  master: 'bg-oxblood/10 text-oxblood',
  connoisseur: 'bg-camel/15 text-camel',
};

const TIER_LABEL: Record<'master' | 'connoisseur', string> = {
  master: 'Master Cut',
  connoisseur: 'Connoisseur',
};

export type ReviewCardProps = {
  variant: 'light' | 'dark';
  quote: ReactNode;
  name: string;
  meta: string;
  avatarColor: string;
  tier?: 'master' | 'connoisseur';
};

const ReviewCard = ({ variant, quote, name, meta, avatarColor, tier }: ReviewCardProps) => {
  const isDark = variant === 'dark';
  const surface = isDark ? 'bg-ink text-cream' : 'bg-paper text-ink';
  const reviewerBorder = isDark ? 'border-cream/15' : 'border-ink/10';
  const initials = name.split(' ').map((n) => n[0]).join('');

  return (
    <article
      className={`relative rounded-sm px-7 py-10 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-[0_30px_60px_rgba(28,24,20,0.08)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:px-11 md:py-12 ${surface}`}
    >
      <div
        aria-hidden='true'
        className='mb-2 font-display text-[clamp(56px,9vw,80px)] leading-[0.7] text-camel'
      >
        &ldquo;
      </div>
      <div aria-hidden='true' className='mb-5 text-sm tracking-[2px] text-camel'>
        ★★★★★
      </div>
      <span className='sr-only'>Rated 5 out of 5 stars</span>
      <p className='mb-9 font-display text-[clamp(19px,2.2vw,22px)] leading-[1.4] tracking-[-0.01em] font-normal'>
        {quote}
      </p>
      <div className={`flex items-center gap-4 border-t pt-6 ${reviewerBorder}`}>
        <div
          aria-hidden='true'
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${avatarColor}`}
        >
          {initials}
        </div>
        <div>
          <div className='mb-1 flex items-center gap-2'>
            <span className='text-[15px] font-semibold'>{name}</span>
            {tier && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] uppercase ${TIER_PILL[tier]}`}
              >
                {TIER_LABEL[tier]}
              </span>
            )}
          </div>
          <div className='text-xs tracking-widest uppercase opacity-60'>{meta}</div>
        </div>
      </div>
    </article>
  );
};

export default ReviewCard;
