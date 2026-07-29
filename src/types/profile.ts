import type { OrderStatus, PaymentMethod } from '@/models/Order';
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
  settlementStatus?: 'pending' | 'settled' | 'failed';
  createdAt: string;
  updatedAt: string;
};
