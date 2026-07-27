import { describe, expect, it } from 'vitest';

import { formatSecondsClock, CART_TTL_MS, CART_TTL_MINUTES } from './useCartExpiry';

// The countdown is rendered in two places at once — the global banner and the
// drawer's own chip, which sits above a translucent scrim that leaves the
// banner faintly visible. They must format the same second identically.
describe('formatSecondsClock', () => {
  it('pads seconds to two digits', () => {
    expect(formatSecondsClock(61)).toBe('1:01');
  });

  it('renders a whole minute without stray padding on the minute part', () => {
    expect(formatSecondsClock(600)).toBe('10:00');
  });

  it('renders sub-minute values with a zero minute', () => {
    expect(formatSecondsClock(9)).toBe('0:09');
  });

  it('renders zero', () => {
    expect(formatSecondsClock(0)).toBe('0:00');
  });

  it('renders the full window as 30:00', () => {
    expect(formatSecondsClock(CART_TTL_MS / 1000)).toBe('30:00');
  });
});

describe('cart TTL constants', () => {
  // The hold copy interpolates the minutes figure; if these drift the drawer
  // promises a window the timer doesn't honour.
  it('keeps the minutes constant consistent with the millisecond one', () => {
    expect(CART_TTL_MINUTES).toBe(CART_TTL_MS / 60_000);
    expect(CART_TTL_MINUTES).toBe(30);
  });
});
