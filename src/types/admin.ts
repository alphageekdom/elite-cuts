import type { ProductCategory } from '@/lib/admin-constants';
import type { MeatQualityTier, PricingType } from '@/lib/products/constants';

export type ProductTableRow = {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  // Backcompat — stamped from canonical pricing fields on save. The catalog
  // and cart still read this in Phase 1; Phase 2 swaps them to
  // displayPriceLabel.
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isActive: boolean;
  isAged: boolean;
  isNewArrival: boolean;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
  parLevel?: number;
  reorderPoint?: number;

  // — Realistic pricing model. Optional on the row so legacy products that
  // pre-date Phase 1 can still serialize cleanly; the admin form treats a
  // missing pricingType on edit as "admin must pick one before saving".
  pricingType?: PricingType;
  cutType?: string;
  qualityTier?: MeatQualityTier;
  packagePrice?: number;
  packageWeightLb?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  includedItems?: string[];
  displayPriceLabel?: string;
  displayWeightLabel?: string;
  isEstimatedPrice?: boolean;

  createdAt: string;
  updatedAt: string;
};

export type ProductCounts = {
  all: number;
  inStock: number;
  outOfStock: number;
  featured: number;
  avgPrice: number;
};

export type CustomerTableRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
  lastOrderAt?: string;
  defaultCity?: string;
  savedCutsCount: number;
  adminNote?: string;
  // Soft-delete state — set when the user has requested deletion (self or
  // admin) and is inside the 30-day grace window. Cleared on restore.
  deletedAt?: string;
  deletionScheduledFor?: string;
  // Dormancy state — `dormancyWarnedAt` is set by the scan when the customer
  // is inactive past the threshold and cleared on activity. `lastActiveAt`
  // is the most recent sign-in or order timestamp.
  dormancyWarnedAt?: string;
  lastActiveAt?: string;
  // Phase B — true for the seeded demo customer, surfaced in the row so the
  // dashboard can render a "Demo" pill and grey out destructive actions.
  isDemo?: boolean;
};

export type CustomerCounts = {
  all: number;
  new: number;
  active: number;
  connoisseurPlus: number;
  dormant?: number;
};

export type OrderTableRow = {
  id: string;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    image: string;
    qty: number;
    price: number;
    productType: string;
    refunded: boolean;
    refundedAt?: string;
    // Phase 3 pricing snapshot. Variable-weight lines (pricingType:
    // 'per_lb' | 'whole_item_by_weight') carry pricePerLb +
    // estimatedWeightLb so the admin drawer can show the realized-weight
    // input and the receipt can render the "estimated vs final" copy.
    pricingType?: PricingType;
    pricePerLb?: number;
    estimatedWeightLb?: number;
    minWeightLb?: number;
    maxWeightLb?: number;
    displayPriceLabel?: string;
    displayWeightLabel?: string;
    realizedWeightLb?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  isPaid: boolean;
  paidAt?: string;
  paymentMethod: string;
  paymentStatus: string;
  refundedAmount: number;
  pickupLocation: string;
  pickedUp: boolean;
  fulfillmentType?: 'pickup' | 'delivery';
  cancellationReason?: string;
  pointsAwarded: number;
  pointsRedeemed: number;
  pointsRedemptionValueCents: number;
  pointsRedemptionReturned: number;
  memberDiscount: number;
  promoDiscount: number;
  promoCode?: string;
  createdAt: string;
  // Phase 4 — auto-settle envelope. `settlementStatus` is undefined when
  // the order didn't opt in (most orders); 'pending' while waiting for
  // realized weights + completion; 'settled' / 'failed' afterward.
  autoSettleAtPickup?: boolean;
  settlementStatus?: 'pending' | 'settled' | 'failed';
  settlementError?: string;
  settlementPaymentIntents?: Array<{
    id: string;
    amount: number;
    kind: 'capture' | 'auto_refund';
    createdAt: string;
  }>;
};

export type StatusCounts = {
  all: number;
  orderPlaced: number;
  preparing: number;
  readyForPickup: number;
  outForDelivery: number;
  completed: number;
  cancelled: number;
};

export type OrderRow = {
  id: string;
  orderRef: string;
  customerName: string;
  customerEmail: string;
  cut: string;
  status: string;
  total: number;
};
