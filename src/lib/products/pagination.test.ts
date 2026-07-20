import { describe, expect, it } from 'vitest';

import { paginateCatalog } from './pagination';

const PAGE_SIZE = 12;

describe('paginateCatalog', () => {
  it('resolves a normal first page', () => {
    expect(paginateCatalog(1, 39, PAGE_SIZE)).toEqual({
      totalPages: 4,
      safePage: 1,
      skip: 0,
      start: 1,
      end: 12,
    });
  });

  it('clamps a page past the end back to the last page', () => {
    // The regression this helper exists for: skipping on the raw page number
    // returned zero documents while the count still read "37–39 of 39".
    const { safePage, skip, start, end } = paginateCatalog(999, 39, PAGE_SIZE);
    expect(safePage).toBe(4);
    expect(skip).toBe(36);
    expect(start).toBe(37);
    expect(end).toBe(39);
  });

  it('clamps a zero or negative page up to the first page', () => {
    expect(paginateCatalog(0, 39, PAGE_SIZE).safePage).toBe(1);
    expect(paginateCatalog(-5, 39, PAGE_SIZE)).toMatchObject({
      safePage: 1,
      skip: 0,
      start: 1,
    });
  });

  it('reports a single empty page when nothing matches', () => {
    expect(paginateCatalog(1, 0, PAGE_SIZE)).toEqual({
      totalPages: 1,
      safePage: 1,
      skip: 0,
      start: 0,
      end: 0,
    });
  });

  it('does not add a trailing page when the total divides evenly', () => {
    const { totalPages, end } = paginateCatalog(2, 24, PAGE_SIZE);
    expect(totalPages).toBe(2);
    expect(end).toBe(24);
  });

  it('handles a last page holding a single item', () => {
    const { totalPages, safePage, start, end } = paginateCatalog(
      4,
      37,
      PAGE_SIZE,
    );
    expect(totalPages).toBe(4);
    expect(safePage).toBe(4);
    expect(start).toBe(37);
    expect(end).toBe(37);
  });
});
