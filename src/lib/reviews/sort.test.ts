import { describe, expect, it } from 'vitest';

import { mostHelpfulReviewId, sortReviews, type SortableReview } from './sort';

const R = (
  _id: string,
  rating: number,
  helpfulCount: number,
  createdAtMs: number,
): SortableReview => ({ _id, rating, helpfulCount, createdAtMs });

// id, rating, helpful, time
const A = R('a', 5, 2, 300);
const B = R('b', 3, 5, 100);
const C = R('c', 5, 0, 200);
const LIST = [A, B, C];

describe('sortReviews', () => {
  it('does not mutate the input', () => {
    const before = [...LIST];
    sortReviews(LIST, 'highest');
    expect(LIST).toEqual(before);
  });

  it('recent = newest first', () => {
    expect(sortReviews(LIST, 'recent').map((r) => r._id)).toEqual(['a', 'c', 'b']);
  });

  it('highest = rating desc, newest breaks ties', () => {
    // a and c both 5★; a is newer → a before c
    expect(sortReviews(LIST, 'highest').map((r) => r._id)).toEqual(['a', 'c', 'b']);
  });

  it('lowest = rating asc, newest breaks ties', () => {
    expect(sortReviews(LIST, 'lowest').map((r) => r._id)).toEqual(['b', 'a', 'c']);
  });

  it('helpful = helpful count desc, newest breaks ties', () => {
    expect(sortReviews(LIST, 'helpful').map((r) => r._id)).toEqual(['b', 'a', 'c']);
  });
});

describe('mostHelpfulReviewId', () => {
  it('picks the single top-voted review', () => {
    expect(mostHelpfulReviewId(LIST)).toBe('b');
  });

  it('returns null when nothing has any helpful votes', () => {
    expect(mostHelpfulReviewId([C, R('d', 4, 0, 500)])).toBeNull();
  });

  it('breaks a helpful tie by most recent', () => {
    const older = R('old', 4, 3, 100);
    const newer = R('new', 4, 3, 999);
    expect(mostHelpfulReviewId([older, newer])).toBe('new');
  });

  it('returns null for an empty list', () => {
    expect(mostHelpfulReviewId([])).toBeNull();
  });
});
