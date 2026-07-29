import { describe, expect, it } from 'vitest';

import { orderRef, orderRefBare } from './reference';

// A realistic Mongo ObjectId hex string.
const ID = '66a1f4c9e21b8d0f3a5c5d61';

describe('order reference', () => {
  it('is the last four characters, upper-cased, behind an EC- prefix', () => {
    expect(orderRef(ID)).toBe('#EC-5D61');
    expect(orderRefBare(ID)).toBe('EC-5D61');
  });

  // The two surfaces that had drifted. The confirmation page printed the last
  // eight with no prefix and the points ledger the last six, so the same order
  // read as three different references depending on the page — and the counter
  // is asked to match whichever one the customer quotes.
  it('gives the same answer everywhere for the same order', () => {
    expect(orderRef(ID)).toBe(`#${orderRefBare(ID)}`);
    expect(orderRef(ID)).not.toContain(ID.slice(-8).toUpperCase());
  });

  it('only decorates the display form, so the bare form is safe to copy', () => {
    expect(orderRefBare(ID).startsWith('#')).toBe(false);
  });

  it('does not throw on an id shorter than four characters', () => {
    expect(orderRefBare('a1')).toBe('EC-A1');
  });
});
