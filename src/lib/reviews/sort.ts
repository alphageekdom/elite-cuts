// Pure review-list helpers for the product detail page. The client review
// list owns sort state and a capped initial render; these keep the sort
// comparisons and the derived "most helpful" pick out of the component so
// they can be unit-tested without rendering anything. That is a preference for
// testing pure functions cheaply, not a workaround: components *can* be tested
// here, by opting a file into jsdom with a `// @vitest-environment jsdom`
// docblock. (This note claimed the opposite until 2026-08-07.)

export const REVIEW_SORTS = ['recent', 'highest', 'lowest', 'helpful'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export const REVIEW_SORT_LABEL: Record<ReviewSort, string> = {
  recent: 'Most recent',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
  helpful: 'Most helpful',
};

// The subset of a serialized review these helpers compare on.
export type SortableReview = {
  _id: string;
  rating: number;
  helpfulCount: number;
  createdAtMs: number;
};

// Returns a NEW sorted array — never mutates the input. Every mode falls back
// to most-recent as the tiebreaker so the order is stable and deterministic
// (equal ratings / equal helpful counts still read newest-first).
export function sortReviews<T extends SortableReview>(reviews: T[], mode: ReviewSort): T[] {
  const byRecent = (a: T, b: T) => b.createdAtMs - a.createdAtMs;
  const copy = [...reviews];
  switch (mode) {
    case 'recent':
      return copy.sort(byRecent);
    case 'highest':
      return copy.sort((a, b) => b.rating - a.rating || byRecent(a, b));
    case 'lowest':
      return copy.sort((a, b) => a.rating - b.rating || byRecent(a, b));
    case 'helpful':
      return copy.sort((a, b) => b.helpfulCount - a.helpfulCount || byRecent(a, b));
  }
}

// The single review that carries the "Most helpful" badge. Derived, never
// stored: the top-voted review, ties broken by most recent, and null when no
// review has any helpful votes at all (so an untouched list shows no badge).
export function mostHelpfulReviewId<T extends SortableReview>(reviews: T[]): string | null {
  let best: T | null = null;
  for (const r of reviews) {
    if (r.helpfulCount <= 0) continue;
    if (
      !best ||
      r.helpfulCount > best.helpfulCount ||
      (r.helpfulCount === best.helpfulCount && r.createdAtMs > best.createdAtMs)
    ) {
      best = r;
    }
  }
  return best?._id ?? null;
}
