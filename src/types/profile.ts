import type { OrderStatus, PaymentMethod, SettlementStatus } from '@/models/Order';
import type { PricingType } from '@/lib/products/constants';

// The customer-facing order shape the account dashboard renders.
//
// Previously declared inside the profile page itself, which meant every
// component that touched an order imported a type from a route file. It lives
// here now so the dashboard components and the pure derivations in
// `lib/profile/dashboard` can share one definition.
export type ProfileOrderItem = {
  product: string;
  name: string;
  qty: number;
  image: string;
  price: number;
  productType: string;
  refunded: boolean;
  pricingType?: PricingType;
  pricePerLb?: number;
  realizedWeightLb?: number;
};

export type ProfileOrder = {
  _id: string;
  orderItems: ProfileOrderItem[];
  subtotal: number;
  tax: number;
  totalCost: number;
  /**
   * Difference between what the cuts actually weighed at pickup and what was
   * charged, or absent when no line was weighed. Computed server-side through
   * `realizedOrderTotal` — the same tax-aware helper the receipt, confirmation
   * and admin drawer use — because a bare sum of the line deltas omits tax and
   * had this card quoting a different figure from the receipt for the same
   * order.
   */
  realizedTotalShift?: number;
  isPaid: boolean;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  pickupLocation: string;
  pickedUp: boolean;
  fulfillmentType?: 'pickup' | 'delivery';
  /** Slot id (`2026-07-28T16:00`) on newer orders, prose ("4–5p") on older ones. */
  pickupSlot?: string;
  // Phase 4 — auto-settle status surfaced on the profile order card so
  // the customer can tell at a glance whether the settlement charge has
  // been applied to their card.
  settlementStatus?: SettlementStatus;
  createdAt: string;
  updatedAt: string;
};
