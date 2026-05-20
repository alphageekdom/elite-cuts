import { describe, expect, it } from 'vitest';

import { promoInputSchema, flattenPromoIssues } from './schema';

// Minimum valid payload — every other test extends or perturbs this base.
// Mirrors what PromoFormDrawer's buildPayload() produces for the simplest
// "10% off, no constraints" promo an admin could create.
const base = () => ({
  code: 'SUMMER10',
  description: undefined,
  type: 'percent' as const,
  value: 10,
  minSubtotal: null,
  maxDiscount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perCustomerLimit: 1,
  firstOrderOnly: false,
  excludesPoints: true,
  excludesMember: false,
  isActive: true,
  isPublic: false,
});

describe('promoInputSchema', () => {
  describe('happy path', () => {
    it('accepts a minimal valid percent promo', () => {
      const result = promoInputSchema.safeParse(base());
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('SUMMER10');
        expect(result.data.type).toBe('percent');
        expect(result.data.value).toBe(10);
      }
    });

    it('accepts a minimal valid fixed promo', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        type: 'fixed',
        value: 500, // $5.00 in cents
      });
      expect(result.success).toBe(true);
    });
  });

  describe('code regex + normalisation', () => {
    it('rejects a code shorter than 3 chars', () => {
      const result = promoInputSchema.safeParse({ ...base(), code: 'AB' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['code']);
        expect(result.error.issues[0]?.message).toMatch(/3-30/);
      }
    });

    it('rejects a code longer than 30 chars', () => {
      const result = promoInputSchema.safeParse({ ...base(), code: 'A'.repeat(31) });
      expect(result.success).toBe(false);
    });

    it('rejects a code with spaces or punctuation', () => {
      const result = promoInputSchema.safeParse({ ...base(), code: 'SUMMER 10' });
      expect(result.success).toBe(false);
    });

    it('uppercases and trims a lowercase code before validating', () => {
      const result = promoInputSchema.safeParse({ ...base(), code: '  summer10  ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.code).toBe('SUMMER10');
    });
  });

  describe('percent value rules', () => {
    it('rejects 0', () => {
      const result = promoInputSchema.safeParse({ ...base(), value: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects a value above 100', () => {
      const result = promoInputSchema.safeParse({ ...base(), value: 101 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['value']);
      }
    });

    it('rejects a non-integer percent', () => {
      const result = promoInputSchema.safeParse({ ...base(), value: 12.5 });
      expect(result.success).toBe(false);
    });

    it('accepts 1 and 100 at the boundaries', () => {
      expect(promoInputSchema.safeParse({ ...base(), value: 1 }).success).toBe(true);
      expect(promoInputSchema.safeParse({ ...base(), value: 100 }).success).toBe(true);
    });
  });

  describe('fixed value rules', () => {
    it('rejects a non-integer cent amount', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        type: 'fixed',
        value: 5.5,
      });
      expect(result.success).toBe(false);
    });

    it('accepts any positive integer cent amount', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        type: 'fixed',
        value: 12345,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('description trim + length cap', () => {
    it('trims whitespace and persists the trimmed value', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        description: '   weekend feature   ',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.description).toBe('weekend feature');
    });

    it('treats whitespace-only as undefined (clears the field)', () => {
      const result = promoInputSchema.safeParse({ ...base(), description: '     ' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.description).toBeUndefined();
    });

    it('rejects 281 trimmed chars', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        description: 'x'.repeat(281),
      });
      expect(result.success).toBe(false);
    });

    it('accepts 281 chars when 1 char is whitespace (trims before measuring)', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        description: ' ' + 'x'.repeat(280),
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.description).toBe('x'.repeat(280));
    });
  });

  describe('date ordering', () => {
    it('rejects endsAt before startsAt', () => {
      const startsAt = '2026-06-01T00:00:00.000Z';
      const endsAt = '2026-05-01T00:00:00.000Z';
      const result = promoInputSchema.safeParse({ ...base(), startsAt, endsAt });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(['endsAt']);
        expect(result.error.issues[0]?.message).toMatch(/after the start/);
      }
    });

    it('rejects endsAt equal to startsAt', () => {
      const same = '2026-06-01T00:00:00.000Z';
      const result = promoInputSchema.safeParse({
        ...base(),
        startsAt: same,
        endsAt: same,
      });
      expect(result.success).toBe(false);
    });

    it('accepts a valid date window and returns Date objects', () => {
      const result = promoInputSchema.safeParse({
        ...base(),
        startsAt: '2026-06-01T00:00:00.000Z',
        endsAt: '2026-06-30T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startsAt).toBeInstanceOf(Date);
        expect(result.data.endsAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('optional integer fields', () => {
    it('accepts null for minSubtotal, maxDiscount, usageLimit', () => {
      const result = promoInputSchema.safeParse(base());
      expect(result.success).toBe(true);
    });

    it('rejects negative minSubtotal', () => {
      const result = promoInputSchema.safeParse({ ...base(), minSubtotal: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer usageLimit', () => {
      const result = promoInputSchema.safeParse({ ...base(), usageLimit: 5.5 });
      expect(result.success).toBe(false);
    });

    it('rejects usageLimit of 0 (positive only)', () => {
      const result = promoInputSchema.safeParse({ ...base(), usageLimit: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects perCustomerLimit of 0', () => {
      const result = promoInputSchema.safeParse({ ...base(), perCustomerLimit: 0 });
      expect(result.success).toBe(false);
    });
  });
});

describe('flattenPromoIssues', () => {
  it('collapses issues by first path segment, keeping the first message', () => {
    const issues = [
      { path: ['code'], message: 'Code must be 3-30 characters' },
      { path: ['code'], message: 'Code second issue (ignored)' },
      { path: ['endsAt'], message: 'End date must be after the start date' },
    ];
    const flat = flattenPromoIssues(issues);
    expect(flat).toEqual({
      code: 'Code must be 3-30 characters',
      endsAt: 'End date must be after the start date',
    });
  });

  it('uses "_" as the key when the path is empty', () => {
    const flat = flattenPromoIssues([{ path: [], message: 'Top-level error' }]);
    expect(flat._).toBe('Top-level error');
  });
});
