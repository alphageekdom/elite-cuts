import { describe, expect, it } from 'vitest';

import { allocateRefund, netCollected, paymentStatusFor } from './refunds';
import type { SettlementTransaction } from '@/models/Order';

// Phase 4 auto-settlement moves the realized-vs-estimate difference AFTER
// checkout: a `capture` is a second PaymentIntent for the extra, an
// `auto_refund` claws part of the original back. Refund math that only knows
// about `totalCost` and the original intent goes wrong in both directions —
// short-paying a captured order, and asking Stripe for more than an
// auto-refunded intent still holds (which Stripe rejects outright).

const capture = (id: string, amount: number): SettlementTransaction => ({
  id,
  amount,
  kind: 'capture',
  createdAt: new Date('2026-07-30T00:00:00Z'),
});

const autoRefund = (id: string, amount: number): SettlementTransaction => ({
  id,
  amount,
  kind: 'auto_refund',
  createdAt: new Date('2026-07-30T00:00:00Z'),
});

describe('netCollected', () => {
  it('is the original total when nothing settled', () => {
    expect(netCollected(104.5, undefined)).toBe(104.5);
    expect(netCollected(104.5, [])).toBe(104.5);
  });

  it('adds a capture — the customer paid more at pickup', () => {
    expect(netCollected(104.5, [capture('pi_1', 16.5)])).toBe(121);
  });

  it('subtracts an auto-refund — part of the charge went back', () => {
    expect(netCollected(104.5, [autoRefund('re_1', 11)])).toBe(93.5);
  });

  it('never goes negative', () => {
    expect(netCollected(10, [autoRefund('re_1', 25)])).toBe(0);
  });
});

describe('allocateRefund', () => {
  it('draws from the original intent when nothing settled', () => {
    expect(
      allocateRefund({
        paymentIntentId: 'pi_original',
        totalCost: 104.5,
        settlements: undefined,
        alreadyRefunded: 0,
        amount: 104.5,
      }),
    ).toEqual([{ paymentIntentId: 'pi_original', amount: 104.5 }]);
  });

  it('spills onto the capture intent once the original is drained', () => {
    // The scenario that used to short the customer: they paid 104.50 at
    // checkout and 16.50 more at pickup, and a full cancel refunded only the
    // original intent's 104.50.
    expect(
      allocateRefund({
        paymentIntentId: 'pi_original',
        totalCost: 104.5,
        settlements: [capture('pi_settle', 16.5)],
        alreadyRefunded: 0,
        amount: 121,
      }),
    ).toEqual([
      { paymentIntentId: 'pi_original', amount: 104.5 },
      { paymentIntentId: 'pi_settle', amount: 16.5 },
    ]);
  });

  it('never asks an auto-refunded intent for more than it still holds', () => {
    // 104.50 charged, 11 already returned by settlement → 93.50 left. Asking
    // for the full 93.50 must stay within that.
    const allocations = allocateRefund({
      paymentIntentId: 'pi_original',
      totalCost: 104.5,
      settlements: [autoRefund('re_settle', 11)],
      alreadyRefunded: 0,
      amount: 93.5,
    });
    expect(allocations).toEqual([
      { paymentIntentId: 'pi_original', amount: 93.5 },
    ]);
  });

  it('resumes where an earlier partial refund stopped', () => {
    // 40 already returned off the original, now refunding the rest of a
    // captured order: 64.50 left on the original, then the capture.
    expect(
      allocateRefund({
        paymentIntentId: 'pi_original',
        totalCost: 104.5,
        settlements: [capture('pi_settle', 16.5)],
        alreadyRefunded: 40,
        amount: 81,
      }),
    ).toEqual([
      { paymentIntentId: 'pi_original', amount: 64.5 },
      { paymentIntentId: 'pi_settle', amount: 16.5 },
    ]);
  });

  it('skips a fully-consumed source entirely', () => {
    expect(
      allocateRefund({
        paymentIntentId: 'pi_original',
        totalCost: 104.5,
        settlements: [capture('pi_settle', 16.5)],
        alreadyRefunded: 104.5,
        amount: 16.5,
      }),
    ).toEqual([{ paymentIntentId: 'pi_settle', amount: 16.5 }]);
  });

  it('allocates nothing when there is nothing owed', () => {
    expect(
      allocateRefund({
        paymentIntentId: 'pi_original',
        totalCost: 104.5,
        settlements: undefined,
        alreadyRefunded: 0,
        amount: 0,
      }),
    ).toEqual([]);
  });

  it('stops at available capacity rather than over-allocating', () => {
    // Defensive: the caller caps at `netCollected`, but if an amount past
    // that ever arrived the allocation must not invent a source for it.
    const allocations = allocateRefund({
      paymentIntentId: 'pi_original',
      totalCost: 50,
      settlements: undefined,
      alreadyRefunded: 0,
      amount: 999,
    });
    expect(allocations).toEqual([{ paymentIntentId: 'pi_original', amount: 50 }]);
  });
});

describe('paymentStatusFor', () => {
  it('leaves the status alone when nothing is refunded', () => {
    expect(
      paymentStatusFor('Completed', {
        refundedSubtotal: 0,
        refundedTax: 0,
        refundedAmount: 0,
        refundedCount: 0,
        totalCount: 3,
      }),
    ).toBe('Completed');
  });

  it('reports partial and full refunds', () => {
    const base = { refundedSubtotal: 10, refundedTax: 1, refundedAmount: 11 };
    expect(
      paymentStatusFor('Completed', { ...base, refundedCount: 1, totalCount: 3 }),
    ).toBe('Partially Refunded');
    expect(
      paymentStatusFor('Completed', { ...base, refundedCount: 3, totalCount: 3 }),
    ).toBe('Refunded');
  });
});
