import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// orderSettlement.ts pulls in `server-only`, the Mongoose Order model,
// the Stripe SDK, and DELIVERY_FEE. Each gets stubbed to the minimum
// surface the SUT touches so the test focuses on the branch logic
// (gates, delta computation, stub vs real Stripe path) rather than the
// transitive infrastructure.

vi.mock('server-only', () => ({}));

const stripeMocks = vi.hoisted(() => ({
  paymentIntentsRetrieve: vi.fn(),
  paymentIntentsCreate: vi.fn(),
  refundsCreate: vi.fn(),
  isStub: vi.fn(() => true),
}));

const orderMocks = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock('@/models/Order', () => ({
  default: { findById: orderMocks.findById },
}));

vi.mock('@/lib/payments/stripe', () => ({
  isStubMode: () => stripeMocks.isStub(),
  getStripe: () => ({
    paymentIntents: {
      retrieve: stripeMocks.paymentIntentsRetrieve,
      create: stripeMocks.paymentIntentsCreate,
    },
    refunds: { create: stripeMocks.refundsCreate },
  }),
  dollarsToCents: (n: number) => Math.round(n * 100),
}));

vi.mock('@/lib/checkout/totals', () => ({ DELIVERY_FEE: 8 }));

import { runOrderSettlement } from './orderSettlement';

// ── Helpers ──────────────────────────────────────────────────────────────

// Build a mock OrderDocument-shaped object the SUT can call .save() on.
// Each test passes overrides — Object.assign so mutations from the SUT
// (e.g. setting settlementStatus) are observable via the same object.
type OrderShape = {
  _id: string;
  user?: unknown;
  paymentMethod: string;
  autoSettleAtPickup?: boolean;
  subtotal: number;
  tax: number;
  totalCost: number;
  memberDiscount?: number;
  promoDiscount?: number;
  pointsRedemptionValueCents?: number;
  fulfillmentType?: 'pickup' | 'delivery';
  paymentResult: {
    paymentIntentId?: string;
    settlementStatus?: 'pending' | 'settled' | 'failed';
    settlementError?: string;
    settlementPaymentIntents?: { id: string; amount: number; kind: 'capture' | 'auto_refund'; createdAt: Date }[];
  };
  orderItems: Array<{
    qty: number;
    price: number;
    pricingType?: string;
    pricePerLb?: number;
    estimatedWeightLb?: number;
    minWeightLb?: number;
    maxWeightLb?: number;
    realizedWeightLb?: number;
  }>;
  save: ReturnType<typeof vi.fn>;
};

function makeOrder(overrides: Partial<OrderShape> = {}): OrderShape {
  const order: OrderShape = {
    _id: 'order123',
    user: 'user1',
    paymentMethod: 'Stripe',
    autoSettleAtPickup: true,
    subtotal: 24.99,
    tax: 2.5,
    totalCost: 27.49,
    paymentResult: {
      paymentIntentId: 'pi_original',
      settlementStatus: 'pending',
      settlementPaymentIntents: [],
    },
    orderItems: [
      {
        qty: 1,
        price: 24.99,
        pricingType: 'per_lb',
        pricePerLb: 24.99,
        estimatedWeightLb: 1,
        minWeightLb: 0.75,
        maxWeightLb: 1.25,
        realizedWeightLb: 1, // matches estimate
      },
    ],
    save: vi.fn(async function (this: OrderShape) {
      return this;
    }) as never,
    ...overrides,
  };
  // Bind save to the order so the SUT's `this.save()` calls work.
  order.save = vi.fn(async () => order) as never;
  return order;
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeMocks.isStub.mockReturnValue(true);
});

// ── Tests ────────────────────────────────────────────────────────────────

describe('runOrderSettlement — gates', () => {
  it('skips when the order did not opt in to auto-settle', async () => {
    orderMocks.findById.mockResolvedValueOnce(makeOrder({ autoSettleAtPickup: false }));
    const result = await runOrderSettlement('order123');
    expect(result).toEqual({ status: 'skipped', reason: 'not_opted_in' });
  });

  it('skips when the order is a guest order', async () => {
    orderMocks.findById.mockResolvedValueOnce(makeOrder({ user: undefined }));
    const result = await runOrderSettlement('order123');
    expect(result).toEqual({ status: 'skipped', reason: 'guest_order' });
  });

  it('skips when the paymentMethod is the demo Card tile', async () => {
    orderMocks.findById.mockResolvedValueOnce(makeOrder({ paymentMethod: 'Credit Card' }));
    const result = await runOrderSettlement('order123');
    expect(result).toEqual({ status: 'skipped', reason: 'demo_payment_method' });
  });

  it('skips when any variable-weight line is still missing realized weight', async () => {
    orderMocks.findById.mockResolvedValueOnce(
      makeOrder({
        orderItems: [
          {
            qty: 1,
            price: 24.99,
            pricingType: 'per_lb',
            pricePerLb: 24.99,
            estimatedWeightLb: 1,
            minWeightLb: 0.75,
            maxWeightLb: 1.25,
            // realizedWeightLb intentionally unset
          },
        ],
      }),
    );
    const result = await runOrderSettlement('order123');
    expect(result).toEqual({ status: 'skipped', reason: 'incomplete_weighing' });
  });

  it('skips when the order has already been settled', async () => {
    orderMocks.findById.mockResolvedValueOnce(
      makeOrder({
        paymentResult: {
          paymentIntentId: 'pi_original',
          settlementStatus: 'settled',
          settlementPaymentIntents: [],
        },
      }),
    );
    const result = await runOrderSettlement('order123');
    expect(result).toEqual({ status: 'skipped', reason: 'already_settled' });
  });

  it('fails when realized weight exceeds the consent ceiling (maxWeightLb)', async () => {
    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 2, // 1.6x the max — outside consent
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);
    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toMatch(/consent ceiling/i);
    }
    expect(order.paymentResult.settlementStatus).toBe('failed');
    expect(order.save).toHaveBeenCalled();
  });

  it('respects the qty multiplier on the consent ceiling (combined weight per line)', async () => {
    // qty=2 ribeyes at maxWeightLb=1.25 each → line ceiling = 2.5 lb.
    // Two cuts at 1.2 lb each = 2.4 lb combined is fine; 2.6 lb is over.
    const okOrder = makeOrder({
      subtotal: 49.98,
      tax: 5,
      totalCost: 54.98,
      orderItems: [
        {
          qty: 2,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 2.4, // within 2 × 1.25 = 2.5 ceiling
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(okOrder);
    const okResult = await runOrderSettlement('order123');
    expect(okResult.status).toBe('settled'); // accepted, fires Stripe stub
    expect(okOrder.paymentResult.settlementStatus).toBe('settled');

    const overOrder = makeOrder({
      subtotal: 49.98,
      tax: 5,
      totalCost: 54.98,
      orderItems: [
        {
          qty: 2,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 2.6, // over the 2.5 line ceiling
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(overOrder);
    const overResult = await runOrderSettlement('order123');
    expect(overResult.status).toBe('failed');
    expect(overOrder.paymentResult.settlementStatus).toBe('failed');
  });
});

describe('runOrderSettlement — no-op branch', () => {
  it('marks settled with kind no_op when realized matches estimate exactly', async () => {
    const order = makeOrder(); // default realized = 1, estimate = 1
    orderMocks.findById.mockResolvedValueOnce(order);
    const result = await runOrderSettlement('order123');
    expect(result).toMatchObject({ status: 'settled', kind: 'no_op', amount: 0 });
    expect(order.paymentResult.settlementStatus).toBe('settled');
    expect(stripeMocks.paymentIntentsCreate).not.toHaveBeenCalled();
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });
});

describe('runOrderSettlement — stub mode', () => {
  it('captures the difference when realized > estimate', async () => {
    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 1.2, // ~$30 realized vs $24.99 estimate
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);
    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('settled');
    if (result.status === 'settled') {
      expect(result.kind).toBe('capture');
      expect(result.amount).toBeGreaterThan(0);
      expect(result.transactionId).toMatch(/^stub_settlement_/);
    }
    expect(order.paymentResult.settlementStatus).toBe('settled');
    expect(order.paymentResult.settlementPaymentIntents).toHaveLength(1);
    expect(order.paymentResult.settlementPaymentIntents?.[0].kind).toBe('capture');
  });

  it('refunds the overage when realized < estimate', async () => {
    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 0.8, // ~$20 realized vs $24.99 estimate
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);
    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('settled');
    if (result.status === 'settled') {
      expect(result.kind).toBe('auto_refund');
      expect(result.amount).toBeGreaterThan(0);
    }
    expect(order.paymentResult.settlementPaymentIntents?.[0].kind).toBe('auto_refund');
  });
});

describe('runOrderSettlement — real Stripe path', () => {
  beforeEach(() => {
    stripeMocks.isStub.mockReturnValue(false);
  });

  it('charges off-session for the difference on realized > estimate', async () => {
    stripeMocks.paymentIntentsRetrieve.mockResolvedValueOnce({
      payment_method: 'pm_test_123',
      customer: 'cus_test_456',
    });
    stripeMocks.paymentIntentsCreate.mockResolvedValueOnce({ id: 'pi_settlement_001' });

    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 1.2,
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);

    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('settled');
    if (result.status === 'settled') {
      expect(result.kind).toBe('capture');
      expect(result.transactionId).toBe('pi_settlement_001');
    }
    expect(stripeMocks.paymentIntentsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test_456',
        payment_method: 'pm_test_123',
        off_session: true,
        confirm: true,
      }),
    );
  });

  it('marks failed when the off-session charge throws', async () => {
    stripeMocks.paymentIntentsRetrieve.mockResolvedValueOnce({
      payment_method: 'pm_test_123',
      customer: 'cus_test_456',
    });
    stripeMocks.paymentIntentsCreate.mockRejectedValueOnce(new Error('Your card was declined.'));

    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 1.2,
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);

    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toMatch(/declined/i);
    }
    expect(order.paymentResult.settlementStatus).toBe('failed');
    expect(order.paymentResult.settlementError).toMatch(/declined/i);
  });

  it('marks failed when the original PaymentIntent has no payment method on file', async () => {
    stripeMocks.paymentIntentsRetrieve.mockResolvedValueOnce({
      payment_method: null,
      customer: 'cus_test_456',
    });

    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 1.2,
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);

    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('failed');
    expect(order.paymentResult.settlementStatus).toBe('failed');
    expect(stripeMocks.paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('issues a partial refund on realized < estimate', async () => {
    stripeMocks.refundsCreate.mockResolvedValueOnce({ id: 're_settlement_001' });

    const order = makeOrder({
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 0.8,
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);

    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('settled');
    if (result.status === 'settled') {
      expect(result.kind).toBe('auto_refund');
      expect(result.transactionId).toBe('re_settlement_001');
    }
    expect(stripeMocks.refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_original' }),
    );
    expect(stripeMocks.paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it('marks failed when the original PaymentIntent id is missing', async () => {
    const order = makeOrder({
      paymentResult: {
        // No paymentIntentId
        settlementStatus: 'pending',
        settlementPaymentIntents: [],
      },
      orderItems: [
        {
          qty: 1,
          price: 24.99,
          pricingType: 'per_lb',
          pricePerLb: 24.99,
          estimatedWeightLb: 1,
          minWeightLb: 0.75,
          maxWeightLb: 1.25,
          realizedWeightLb: 1.2,
        },
      ],
    });
    orderMocks.findById.mockResolvedValueOnce(order);

    const result = await runOrderSettlement('order123');
    expect(result.status).toBe('failed');
    expect(order.paymentResult.settlementStatus).toBe('failed');
    expect(stripeMocks.paymentIntentsCreate).not.toHaveBeenCalled();
  });
});
