// Shared star row for the product detail page. Server-safe (no hooks) so both
// the server page shell and the client review list render the same glyph.

import StarIcon from '@/components/uielements/StarIcon';

const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' } as const;

export default function Stars({
  rating,
  size = 'sm',
}: {
  rating: number;
  size?: keyof typeof SIZES;
}) {
  const full = Math.round(rating);
  return (
    <div
      className='text-camel-deep flex gap-0.5'
      role='img'
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < full} className={SIZES[size]} />
      ))}
    </div>
  );
}
