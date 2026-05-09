'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

type Props = {
  productId: string;
  hasReviewed: boolean;
};

const MAX_COMMENT = 1000;

const Star = ({
  filled,
  size = 'md',
}: {
  filled: boolean;
  size?: 'md' | 'lg';
}) => {
  const cls = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  return (
    <svg
      viewBox='0 0 24 24'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth={filled ? 0 : 1.5}
      aria-hidden
      className={`${cls} transition-colors duration-150`}
    >
      <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
    </svg>
  );
};

export default function ReviewForm({ productId, hasReviewed }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return null;

  if (!session) {
    return (
      <div className='rounded-sm border border-dashed border-line bg-paper px-6 py-10 text-center'>
        <p className='text-[14px] text-muted'>
          <Link
            href='/login'
            className='font-medium text-ink underline-offset-2 hover:underline'
          >
            Sign in
          </Link>{' '}
          to leave a review.
        </p>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div className='rounded-sm border border-line-soft bg-paper px-6 py-8 text-center'>
        <span className='inline-flex items-center gap-2 text-[14px] text-muted'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden
            className='h-4 w-4 text-green'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
          You've already reviewed this cut — thank you.
        </span>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating) {
      toast.error('Please select a star rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      if (res.ok) {
        toast.success('Review submitted — thanks!');
        setRating(0);
        setComment('');
        router.refresh();
      } else if (res.status === 409) {
        toast.error("You've already reviewed this cut.");
        router.refresh();
      } else {
        const data = (await res.json()) as { message?: string };
        toast.error(data.message ?? 'Failed to submit review');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const display = hovered || rating;

  const STAR_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

  return (
    <form onSubmit={handleSubmit} className='space-y-5 md:space-y-6'>
      <div>
        <h3 className='mb-1 font-display text-[22px] font-medium tracking-[-0.01em]'>
          Leave a review
        </h3>
        <p className='text-[13px] text-muted'>
          Share your experience with this cut.
        </p>
      </div>

      {/* Star picker */}
      <div>
        <div className='mb-2 flex items-center gap-0.5 text-camel'>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type='button'
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`Rate ${star} out of 5 — ${STAR_LABELS[star - 1]}`}
              aria-pressed={rating === star}
              className='grid min-h-11 min-w-11 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1'
            >
              <Star filled={star <= display} size='lg' />
            </button>
          ))}
        </div>
        {display > 0 && (
          <p className='text-[12px] font-medium text-camel'>
            {STAR_LABELS[display - 1]}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label htmlFor='review-comment' className='sr-only'>
          Your review
        </label>
        <textarea
          id='review-comment'
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT}
          placeholder='Share your experience with this cut…'
          rows={4}
          className='w-full resize-none rounded-sm border border-line bg-paper px-4 py-3 text-[14px] leading-[1.65] text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-colors duration-200'
        />
        <div className='mt-1 text-right font-mono text-[11px] text-muted'>
          {comment.length} / {MAX_COMMENT}
        </div>
      </div>

      <button
        type='submit'
        disabled={submitting || !rating || !comment.trim()}
        className='rounded-full bg-ink px-6 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-50'
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
