'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import Link from 'next/link';

type OwnReview = { _id: string; rating: number; comment: string };

type Props = {
  productId: string;
  ownReview: OwnReview | null;
};

const MAX_COMMENT = 1000;

const Star = ({ filled, size = 'md' }: { filled: boolean; size?: 'md' | 'lg' }) => {
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

const STAR_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

export default function ReviewForm({ productId, ownReview }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(ownReview?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return null;

  // Not signed in
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

  // Signed in + already reviewed + not editing → placecard
  if (ownReview && !isEditing) {
    return (
      <div className='flex items-center justify-between gap-4 rounded-sm border border-line-soft bg-paper px-6 py-8'>
        <span className='inline-flex items-center gap-2 text-[14px] text-muted'>
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            aria-hidden
            className='h-4 w-4 shrink-0 text-green'
          >
            <polyline points='20 6 9 17 4 12' />
          </svg>
          You&apos;ve already reviewed this cut.
        </span>
        <button
          type='button'
          onClick={() => setIsEditing(true)}
          className='shrink-0 text-[13px] font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline'
        >
          Edit my review
        </button>
      </div>
    );
  }

  // Edit or new submit form
  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a star rating'); return; }
    if (!comment.trim()) { toast.error('Please write a comment'); return; }

    setSubmitting(true);
    try {
      const url = ownReview
        ? `/api/reviews/${ownReview._id}`
        : `/api/products/${productId}`;
      const method = ownReview ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });

      if (res.ok) {
        toast.success(ownReview ? 'Review updated.' : 'Review submitted — thanks!');
        setIsEditing(false);
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

  const handleCancel = () => {
    setRating(ownReview?.rating ?? 0);
    setComment(ownReview?.comment ?? '');
    setIsEditing(false);
  };

  const display = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className='space-y-5 md:space-y-6'>
      <div>
        <h3 className='mb-1 font-display text-[22px] font-medium tracking-[-0.01em]'>
          {ownReview ? 'Edit your review' : 'Leave a review'}
        </h3>
        <p className='text-[13px] text-muted'>
          {ownReview
            ? 'Update your rating or comment below.'
            : 'Share your experience with this cut.'}
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
          className='w-full resize-none rounded-sm border border-line bg-paper px-4 py-3 text-[14px] leading-[1.65] text-ink placeholder:text-muted transition-colors duration-200 focus:border-ink focus:outline-none'
        />
        <div className='mt-1 text-right font-mono text-[11px] text-muted'>
          {comment.length} / {MAX_COMMENT}
        </div>
      </div>

      <div className='flex items-center gap-4'>
        <button
          type='submit'
          disabled={submitting || !rating || !comment.trim()}
          className='rounded-full bg-ink px-6 py-3 text-[13px] font-medium tracking-[0.04em] text-cream transition-colors duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-50'
        >
          {submitting
            ? ownReview ? 'Updating…' : 'Submitting…'
            : ownReview ? 'Update review' : 'Submit review'}
        </button>
        {ownReview && (
          <button
            type='button'
            onClick={handleCancel}
            className='text-[13px] text-muted hover:text-ink'
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
