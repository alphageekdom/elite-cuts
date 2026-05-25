import type { ProductTableRow, OrderTableRow, CustomerTableRow } from '@/types/admin';
import type { ProductCategory } from '@/lib/admin/constants';
import type { MeatQualityTier, PricingType } from '@/lib/products/constants';
import { refundSummary } from '@/lib/orders/refunds';

// Minimal shape of a lean Product document returned from ProductModel.find().lean()
type RawProduct = {
  _id: { toString(): string };
  name: string;
  description?: string;
  category: ProductCategory;
  price: number;
  rating: number;
  images: string[];
  stockCount: number;
  isFeatured: boolean;
  isActive?: boolean;
  isAged?: boolean;
  isNewArrival?: boolean;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
  parLevel?: number;
  reorderPoint?: number;
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
  createdAt: Date;
  updatedAt: Date;
};

// Minimal shape of a lean Order document with user populated
type RawOrder = {
  _id: { toString(): string };
  user: { _id: { toString(): string }; name: string; email: string; isDemo?: boolean } | null;
  orderItems: Array<{
    name: string;
    image: string;
    qty: number;
    price: number;
    productType: string;
    refunded?: boolean;
    refundedAt?: Date | null;
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
  totalCost: number;
  orderStatus: string;
  isPaid: boolean;
  paidAt?: Date | null;
  paymentMethod: string;
  paymentResult?: {
    status?: string;
    settlementStatus?: 'pending' | 'settled' | 'failed';
    settlementError?: string;
    settlementPaymentIntents?: Array<{
      id: string;
      amount: number;
      kind: 'capture' | 'auto_refund';
      createdAt: Date;
    }>;
  };
  autoSettleAtPickup?: boolean;
  pickupLocation: string;
  pickedUp: boolean;
  fulfillmentType?: 'pickup' | 'delivery';
  cancellationReason?: string;
  pointsAwarded?: number;
  pointsRedeemed?: number;
  pointsRedemptionValueCents?: number;
  pointsRedemptionReturned?: number;
  memberDiscount?: number;
  promoDiscount?: number;
  promoCode?: string;
  createdAt: Date;
};

export function serializeProductRow(p: RawProduct): ProductTableRow {
  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description ?? '',
    category: p.category,
    price: p.price,
    rating: p.rating,
    images: p.images,
    stockCount: p.stockCount,
    isFeatured: p.isFeatured,
    isActive: p.isActive ?? true,
    isAged: p.isAged ?? false,
    isNewArrival: p.isNewArrival ?? false,
    sku: p.sku ?? '',
    gradeBreed: p.gradeBreed ?? '',
    supplier: p.supplier ?? '',
    parLevel: p.parLevel,
    reorderPoint: p.reorderPoint,
    pricingType: p.pricingType,
    cutType: p.cutType ?? '',
    qualityTier: p.qualityTier,
    packagePrice: p.packagePrice,
    packageWeightLb: p.packageWeightLb,
    pricePerLb: p.pricePerLb,
    estimatedWeightLb: p.estimatedWeightLb,
    averageWeightLb: p.averageWeightLb,
    minWeightLb: p.minWeightLb,
    maxWeightLb: p.maxWeightLb,
    unitPrice: p.unitPrice,
    bundlePrice: p.bundlePrice,
    includedItems: p.includedItems,
    displayPriceLabel: p.displayPriceLabel,
    displayWeightLabel: p.displayWeightLabel,
    isEstimatedPrice: p.isEstimatedPrice,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeOrderRow(order: RawOrder): OrderTableRow {
  const idStr = order._id.toString();
  const items = order.orderItems.map((item) => ({
    name: item.name,
    image: item.image,
    qty: item.qty,
    price: item.price,
    productType: item.productType,
    refunded: item.refunded ?? false,
    refundedAt: item.refundedAt ? item.refundedAt.toISOString() : undefined,
    pricingType: item.pricingType,
    pricePerLb: item.pricePerLb,
    estimatedWeightLb: item.estimatedWeightLb,
    minWeightLb: item.minWeightLb,
    maxWeightLb: item.maxWeightLb,
    displayPriceLabel: item.displayPriceLabel,
    displayWeightLabel: item.displayWeightLabel,
    realizedWeightLb: item.realizedWeightLb,
  }));
  const summary = refundSummary(items, {
    subtotal: order.subtotal,
    tax: order.tax,
    totalCost: order.totalCost,
  });
  return {
    id: idStr,
    orderRef: `#EC-${idStr.slice(-4).toUpperCase()}`,
    customerName: order.user?.name ?? 'Unknown',
    customerEmail: order.user?.email ?? '',
    isDemo: Boolean(order.user?.isDemo),
    items,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.totalCost,
    status: order.orderStatus,
    isPaid: order.isPaid,
    paidAt: order.paidAt?.toISOString(),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentResult?.status ?? 'Pending',
    refundedAmount: summary.refundedAmount,
    pickupLocation: order.pickupLocation,
    pickedUp: order.pickedUp,
    fulfillmentType: order.fulfillmentType,
    cancellationReason: order.cancellationReason,
    pointsAwarded: order.pointsAwarded ?? 0,
    pointsRedeemed: order.pointsRedeemed ?? 0,
    pointsRedemptionValueCents: order.pointsRedemptionValueCents ?? 0,
    pointsRedemptionReturned: order.pointsRedemptionReturned ?? 0,
    memberDiscount: order.memberDiscount ?? 0,
    promoDiscount: order.promoDiscount ?? 0,
    promoCode: order.promoCode,
    createdAt: order.createdAt.toISOString(),
    autoSettleAtPickup: order.autoSettleAtPickup,
    settlementStatus: order.paymentResult?.settlementStatus,
    settlementError: order.paymentResult?.settlementError,
    settlementPaymentIntents: order.paymentResult?.settlementPaymentIntents?.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      kind: tx.kind,
      createdAt: tx.createdAt.toISOString(),
    })),
  };
}

// Minimal shape of a lean User document returned from UserModel.find().lean()
type RawUser = {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  addresses?: Array<{ city: string; state: string; isDefault?: boolean }>;
  savedCuts?: unknown[];
  adminNote?: string;
  deletedAt?: Date | null;
  deletionScheduledFor?: Date | null;
  dormancyWarnedAt?: Date | null;
  lastActiveAt?: Date | null;
  isDemo?: boolean;
};

export type OrderStats = {
  count: number;
  totalSpend: number;
  lastOrderAt?: string;
};

export function serializeCustomerRow(
  u: RawUser,
  orderMap: Map<string, OrderStats>,
): CustomerTableRow {
  const id = u._id.toString();
  const stats = orderMap.get(id);
  const defaultAddress = (u.addresses ?? []).find((a) => a.isDefault);

  return {
    id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    createdAt: u.createdAt.toISOString(),
    orderCount: stats?.count ?? 0,
    totalSpend: stats?.totalSpend ?? 0,
    lastOrderAt: stats?.lastOrderAt,
    defaultCity: defaultAddress
      ? `${defaultAddress.city}, ${defaultAddress.state}`
      : undefined,
    savedCutsCount: (u.savedCuts ?? []).length,
    adminNote: u.adminNote ?? '',
    deletedAt: u.deletedAt ? u.deletedAt.toISOString() : undefined,
    deletionScheduledFor: u.deletionScheduledFor
      ? u.deletionScheduledFor.toISOString()
      : undefined,
    dormancyWarnedAt: u.dormancyWarnedAt ? u.dormancyWarnedAt.toISOString() : undefined,
    lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : undefined,
    isDemo: Boolean(u.isDemo),
  };
}
