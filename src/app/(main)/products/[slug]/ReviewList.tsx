'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import Stars from '@/components/product/detail/Stars';
import CheckIcon from '@/components/uielements/CheckIcon';
import SortPopover, { type SortOption } from '@/components/ui/SortPopover';
import { avatarColorForId } from '@/lib/format';
import { AVATAR_COLORS, MEMBER_AVATAR_COLORS } from '@/lib/admin/constants';
import {
  REVIEW_SORT_LABEL,
  REVIEW_SORTS,
  mostHelpfulReviewId,
  sortReviews,
  type ReviewSort,
} from '@/lib/reviews/sort';
import ReviewActions from './ReviewActions';

// Canonical here alongside DetailReview; page.tsx imports both so the union
// isn't declared twice and can't drift.
export type UserTier = 'Master Cut' | 'Connoisseur' | 'Regular';

export type DetailReview = {
  _id: string;
  userId: string;
  isOwn: boolean;
  userName: string;
  rating: number;
  comment: string;
  createdAtLabel: string;
  createdAtMs: number;
  userTier: UserTier;
  isVerified: boolean;
  helpfulCount: number;
  viewerHasVoted: boolean;
};

type Props = {
  reviews: DetailReview[];
  // True count across all reviews. `reviews` is capped for display/sorting, so
  // the header count reads this rather than the (possibly shorter) array.
  totalReviews: number;
  viewerSignedIn: boolean;
};

const INITIAL_CAP = 4;

const TIER_PILL: Partial<Record<UserTier, { label: string; cls: string }>> = {
  'Master Cut': { label: 'Master Cut', cls: 'bg-oxblood/10 text-oxblood' },
  Connoisseur: { label: 'Connoisseur', cls: 'bg-camel/15 text-camel-deeper' },
};

const SORT_OPTIONS: readonly SortOption<ReviewSort>[] = REVIEW_SORTS.map(
  (value) => ({
    value,
    label: REVIEW_SORT_LABEL[value],
  }),
);

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const ThumbsUpIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden
    className='h-3.5 w-3.5'
  >
    <path d='M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3' />
  </svg>
);

export default function ReviewList({
  reviews,
  totalReviews,
  viewerSignedIn,
}: Props) {
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [expanded, setExpanded] = useState(false);

  // Optimistic vote state keyed by review id — only holds reviews the viewer
  // has toggled this session; everything else reads its server-rendered value.
  const [votes, setVotes] = useState<
    Record<string, { count: number; voted: boolean }>
  >({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  // Fresh props (e.g. after a router.refresh from submitting/deleting a review)
  // carry the server's authoritative counts — drop the optimistic overrides so
  // a stale snapshot can't mask them. Adjust-during-render per the React 19
  // pattern the rest of the app uses, keyed on the reviews array identity.
  const [prevReviews, setPrevReviews] = useState(reviews);
  if (prevReviews !== reviews) {
    setPrevReviews(reviews);
    setVotes({});
  }

  const resolved = useMemo(
    () =>
      reviews.map((r) => {
        const v = votes[r._id];
        return v ? { ...r, helpfulCount: v.count, viewerHasVoted: v.voted } : r;
      }),
    [reviews, votes],
  );

  // "Most helpful" is derived from live (optimistic) counts so the badge can
  // move the instant a vote flips the leader.
  const mostHelpfulId = useMemo(
    () => mostHelpfulReviewId(resolved),
    [resolved],
  );

  const sorted = useMemo(() => sortReviews(resolved, sort), [resolved, sort]);
  const visible = expanded ? sorted : sorted.slice(0, INITIAL_CAP);
  const isCapped = sorted.length > INITIAL_CAP;

  const toggleExpanded = () => {
    const collapsing = expanded;
    setExpanded(!collapsing);
    // Collapsing drops the reviews that were above the fold, so the viewport
    // would otherwise strand the reader far below the section. Bring the
    // heading back into view (the section top is fixed, so scrolling before
    // the list shrinks is fine).
    if (collapsing) {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      document.getElementById('reviews')?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  const toggleHelpful = async (review: DetailReview) => {
    if (!viewerSignedIn) {
      toast.error('Sign in to vote on reviews.');
      return;
    }
    if (pending[review._id]) return;

    const currentCount = votes[review._id]?.count ?? review.helpfulCount;
    const currentVoted = votes[review._id]?.voted ?? review.viewerHasVoted;
    const nextVoted = !currentVoted;
    const nextCount = currentCount + (nextVoted ? 1 : -1);

    // Optimistic flip
    setVotes((prev) => ({
      ...prev,
      [review._id]: { count: nextCount, voted: nextVoted },
    }));
    setPending((prev) => ({ ...prev, [review._id]: true }));

    try {
      const res = await fetch(`/api/reviews/${review._id}/helpful`, {
        method: 'POST',
      });
      if (!res.ok) {
        // Revert to the pre-click values on any rejection.
        setVotes((prev) => ({
          ...prev,
          [review._id]: { count: currentCount, voted: currentVoted },
        }));
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(data.message ?? 'Could not record your vote.');
        return;
      }
      // Reconcile against the server's authoritative count. A body that fails
      // to parse after a 200 still means the vote committed server-side — keep
      // the optimistic state rather than reverting a change the server took
      // (reverting would leave the next click silently undoing the vote).
      try {
        const data = (await res.json()) as {
          data: { helpfulCount: number; voted: boolean };
        };
        setVotes((prev) => ({
          ...prev,
          [review._id]: {
            count: data.data.helpfulCount,
            voted: data.data.voted,
          },
        }));
      } catch {
        // Optimistic state stands.
      }
    } catch {
      // Network/fetch failure before any response — revert the optimistic flip.
      setVotes((prev) => ({
        ...prev,
        [review._id]: { count: currentCount, voted: currentVoted },
      }));
      toast.error('Something went wrong.');
    } finally {
      setPending((prev) => ({ ...prev, [review._id]: false }));
    }
  };

  return (
    <div>
      {/* Sort control */}
      <div className='mb-6 flex items-center justify-between gap-4'>
        <p className='text-muted text-[13px]'>
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </p>
        <SortPopover<ReviewSort>
          value={sort}
          options={SORT_OPTIONS}
          onChange={(v) => {
            setSort(v);
            setExpanded(false);
          }}
          align='right'
        />
      </div>

      <div className='divide-line-soft divide-y'>
        {visible.map((review) => {
          const isMember = review.userTier !== 'Regular';
          const colorClass = avatarColorForId(
            review.userId,
            isMember ? MEMBER_AVATAR_COLORS : AVATAR_COLORS,
          );
          const isMostHelpful = review._id === mostHelpfulId;
          return (
            <article key={review._id} className='py-7 first:pt-0 last:pb-0'>
              <div className='mb-3.5 flex items-center gap-3.5'>
                <div
                  className={`font-display grid h-10 w-10 shrink-0 place-items-center rounded-full text-[14px] font-medium ${colorClass}`}
                  aria-hidden
                >
                  {initials(review.userName)}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-1.5 text-[14px] font-medium'>
                    {review.userName}
                    {TIER_PILL[review.userTier] && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase ${TIER_PILL[review.userTier]?.cls}`}
                      >
                        {TIER_PILL[review.userTier]?.label}
                      </span>
                    )}
                    {isMostHelpful && (
                      <span className='bg-camel/15 text-camel-deeper rounded-full px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase'>
                        Most helpful
                      </span>
                    )}
                  </div>
                  <div className='text-muted mt-0.5 flex items-center gap-2 text-[11px]'>
                    {review.isVerified && (
                      <>
                        <span className='text-green inline-flex items-center gap-1'>
                          <CheckIcon className='h-2.5 w-2.5' strokeWidth={3} />
                          Verified buyer
                        </span>
                        <span
                          aria-hidden
                          className='h-0.75 w-0.75 rounded-full bg-current opacity-50'
                        />
                      </>
                    )}
                    <span>{review.createdAtLabel}</span>
                  </div>
                </div>
                <Stars rating={review.rating} size='sm' />
              </div>
              <p className='text-ink-soft text-[14px] leading-[1.65]'>
                {review.comment}
              </p>

              <div className='mt-3.5 flex items-center gap-4 text-[12px]'>
                {/* A review author can't vote on their own review, so show a
                    static count there instead of an inert button. */}
                {review.isOwn ? (
                  review.helpfulCount > 0 && (
                    <span className='text-muted inline-flex items-center gap-1.5'>
                      <ThumbsUpIcon />
                      {review.helpfulCount} found this helpful
                    </span>
                  )
                ) : (
                  <button
                    type='button'
                    onClick={() => void toggleHelpful(review)}
                    aria-disabled={pending[review._id]}
                    aria-pressed={review.viewerHasVoted}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-colors duration-200 ${
                      pending[review._id] ? 'opacity-50' : ''
                    } ${
                      review.viewerHasVoted
                        ? 'border-oxblood text-oxblood'
                        : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                    }`}
                  >
                    <ThumbsUpIcon />
                    Helpful
                    {review.helpfulCount > 0 && (
                      <span className='font-mono text-[11px]'>
                        · {review.helpfulCount}
                      </span>
                    )}
                  </button>
                )}
                {review.isOwn && <ReviewActions reviewId={review._id} />}
              </div>
            </article>
          );
        })}
      </div>

      {isCapped && (
        <div className='mt-8 text-center'>
          <button
            type='button'
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className='border-line text-ink-soft hover:border-ink hover:text-ink rounded-full border px-6 py-3 text-[13px] font-medium transition-colors duration-300'
          >
            {expanded
              ? 'Show fewer reviews'
              : `Show all ${sorted.length} reviews`}
          </button>
        </div>
      )}
    </div>
  );
}
