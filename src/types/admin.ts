import type { ProductCategory } from '@/lib/admin-constants';

export type ProductTableRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isAged: boolean;
  isNewArrival: boolean;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
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
