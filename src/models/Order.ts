import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { ORDER_STATUSES, CANCELLATION_REASONS } from '@/lib/orders/constants';
import { PRICING_TYPES, type PricingType } from '@/lib/products/constants';
export { ORDER_STATUSES, CANCELLATION_REASONS };

// The shop's two payment surfaces — `'Credit Card'` for the demo card-form
// path and admin walk-out orders, `'Stripe'` for everything that flowed
// through Stripe Checkout. Cash purchases happen in-store only and don't
// enter the system.
export const PAYMENT_METHODS = ['Credit Card', 'Stripe'] as const;

export const PAYMENT_STATUSES = [
  'Pending',
  'Authorized',
  'Completed',
  'Failed',
  'Partially Refunded',
  'Refunded',
] as const;

export const PAYMENT_PROVIDERS = ['stripe', 'demo'] as const;

// Phase 4 — settlement (auto-charge / auto-refund) lifecycle. `pending` is
// the initial state on an opted-in order; the settlement helper flips it
// to `settled` on success, `failed` on a Stripe error or missing card.
export const SETTLEMENT_STATUSES = ['pending', 'settled', 'failed'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

// One settlement transaction — either a new off-session charge for the
// realized-over-estimate delta (`capture`) or a refund for the
// realized-under-estimate overage (`auto_refund`). Stored as a list so
// retries land alongside the failed attempt for a clean audit trail.
export const SETTLEMENT_KINDS = ['capture', 'auto_refund'] as const;
export type SettlementKind = (typeof SETTLEMENT_KINDS)[number];

export type SettlementTransaction = {
  id: string;
  amount: number; // dollars, positive
  kind: SettlementKind;
  createdAt: Date;
};

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type CancellationReason = (typeof CANCELLATION_REASONS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type OrderItem = {
  product: Types.ObjectId;
  name: string;
  qty: number;
  image: string;
  // Per-unit estimated cost at purchase time. For fixed_package / each /
  // bundle this is the literal product price; for per_lb /
  // whole_item_by_weight it's `pricePerLb × estimatedWeightLb` (the
  // best-guess weight at checkout). `line.price × line.qty` is always the
  // line's estimated total, which is what Stripe charged the customer at
  // the redirect.
  price: number;
  productType: string;
  refunded: boolean;
  refundedAt?: Date;

  // — Phase 3 pricing snapshot. All optional; pre-Phase-3 orders land here
  // with undefined values and every read falls back to `price × qty`.
  // `pricingType` is the discriminator the receipt + admin drawer key off
  // to decide whether to show the realized-weight UI and the
  // "Estimated / Final" copy.
  pricingType?: PricingType;
  // Snapshotted per-lb rate for variable-weight cuts. Drives the
  // realized-total math when `realizedWeightLb` is set:
  // `realizedTotal = pricePerLb × realizedWeightLb`.
  pricePerLb?: number;
  // Snapshotted best-guess weight at purchase. For per_lb it's the
  // product's `estimatedWeightLb`; for whole_item_by_weight it's the
  // `averageWeightLb`. Either way it's "the weight we charged you for at
  // checkout" — the receipt uses it to render the estimated weight range.
  estimatedWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  // Pre-rendered display labels from the product at purchase. Snapshotted
  // so the receipt doesn't have to reach back to a (possibly renamed or
  // deleted) product to render the customer's purchase honestly.
  displayPriceLabel?: string;
  displayWeightLabel?: string;
  // Admin-entered weight at fulfillment, one combined weight per line
  // regardless of qty. When present (and pricingType is variable-weight),
  // the line's realized total replaces the estimate everywhere.
  realizedWeightLb?: number;
  // Bundle contents at purchase, so cuts can be counted without reaching
  // back to the product. Absent on non-bundle lines and on older orders.
  includedItems?: string[];
};

export type PaymentResult = {
  status: PaymentStatus;
  provider: PaymentProvider;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  amountPaid: number;
  currency: string;
  paymentDate: Date;
  // True when the refund mirror was triggered by Stripe (e.g. admin refunded
  // inside the Stripe Dashboard) rather than by an EliteCuts admin action.
  // External refunds don't carry line-item context, so the schema can't mark
  // specific items refunded — this flag tells the audit trail apart.
  refundedExternally?: boolean;

  // — Phase 4 auto-settle envelope. Only set on orders that opted in to
  // `autoSettleAtPickup` at checkout and reached the `Completed` status
  // with every variable-weight line weighed. `pending` is the initial
  // state on an opted-in order; `settled` is the success terminal;
  // `failed` flags the order for in-store settlement.
  settlementStatus?: SettlementStatus;
  // Audit trail of every settlement attempt — successful or retried. The
  // last entry on a `settled` order is the one that succeeded; a `failed`
  // order may have zero entries (Stripe call threw before id was assigned)
  // or one entry from a prior attempt.
  settlementPaymentIntents?: SettlementTransaction[];
  // Last error message from Stripe when settlement failed — surfaced in
  // the admin order drawer so the admin knows whether the card declined,
  // expired, or something else went wrong.
  settlementError?: string;
};

export type DeliveryAddressData = {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
};

// Snapshot of the typed-in contact for guest checkout. Required when `user` is
// null — exactly one of the two must be set (see schema validator below).
export type GuestContact = {
  name: string;
  email: string;
  phone?: string;
};

export type Order = {
  // `null` — not just absent — on an order whose customer was hard-deleted:
  // the anonymization step sets `user: null` and keeps the row as a "Former
  // customer" order. Guest orders omit the field entirely. Review and Message
  // model the same state the same way.
  user?: Types.ObjectId | null;
  guestContact?: GuestContact;
  orderItems: OrderItem[];
  subtotal: number;
  tax: number;
  totalCost: number;
  isPaid: boolean;
  paidAt?: Date;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentResult: PaymentResult;
  pickupLocation: string;
  pickedUp: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  fulfillmentType?: 'pickup' | 'delivery';
  pickupSlot?: string;
  deliveryAddress?: DeliveryAddressData;
  orderNotes?: string;
  cancellationReason?: CancellationReason;
  readyAt?: Date;
  pickedUpAt?: Date;
  cancelledAt?: Date;
  pointsAwarded: number;
  pointsRedeemed: number;
  pointsRedemptionValueCents: number;
  pointsRedemptionReturned: number;  // cumulative pts returned from partial refunds; capped at pointsRedeemed
  memberDiscount: number;
  promoDiscount: number;
  promoCode?: string;
  promoId?: Types.ObjectId;
  // Snapshot of whether the customer ticked "Save this card" at checkout-session
  // time. The stub-mode complete route reads this back to mirror the save after
  // the mock payment clears (real Stripe handles the save via setup_future_usage
  // on the session). Only meaningful for logged-in shoppers.
  saveCardIntent?: boolean;
  // Snapshot of the saved card id the shopper picked at checkout, when they
  // used the saved-cards strip instead of typing a new card. Carries the
  // local `card_...` prefix or the Stripe `pm_...` prefix so future analytics
  // can answer "which card paid for this order" without needing to re-read
  // the card store at the time of the query.
  savedCardIdAtPurchase?: string;
  // Phase 4 — customer opted in to "auto-settle at pickup" at checkout.
  // When true and the order reaches Completed with every variable-weight
  // line weighed, the completion handler fires the settlement step
  // (off-session capture for realized>estimate, partial refund for
  // realized<estimate). Requires either `saveCardIntent` or
  // `savedCardIdAtPurchase` so a payment method is on file. Off for
  // guests and Card-tile demo orders.
  autoSettleAtPickup?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDocument = HydratedDocument<Order>;

const OrderItemSchema = new Schema<OrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      required: [true, 'Product is required'],
      ref: 'Product',
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    qty: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    image: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be a positive number'],
    },
    productType: {
      type: String,
      required: [true, 'Product type is required'],
      trim: true,
    },
    refunded: {
      type: Boolean,
      required: true,
      default: false,
    },
    refundedAt: {
      type: Date,
    },

    // — Phase 3 pricing snapshot + realized weight. All optional; pre-Phase-3
    // orders read with these undefined and fall back to `price × qty`.
    pricingType: {
      type: String,
      enum: [...PRICING_TYPES],
      trim: true,
    },
    pricePerLb:        { type: Number, min: 0 },
    estimatedWeightLb: { type: Number, min: 0 },
    minWeightLb:       { type: Number, min: 0 },
    maxWeightLb:       { type: Number, min: 0 },
    displayPriceLabel:  { type: String, trim: true },
    displayWeightLabel: { type: String, trim: true },
    realizedWeightLb:   { type: Number, min: 0 },

    // What a bundle contains, snapshotted like name and price beside it. The
    // confirmation page counts cuts as well as lines, and reading it off the
    // referenced Product would report today's contents rather than what was
    // bought — and nothing at all once that product is deleted. Absent on
    // orders placed before this shipped, and on every non-bundle line.
    includedItems: { type: [String], default: undefined },
  },
  {
    _id: false,
  },
);

const PaymentResultSchema = new Schema<PaymentResult>(
  {
    status: {
      type: String,
      required: true,
      default: 'Pending',
      enum: [...PAYMENT_STATUSES],
    },
    provider: {
      type: String,
      required: true,
      default: 'demo',
      enum: [...PAYMENT_PROVIDERS],
    },
    checkoutSessionId: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount paid must be a positive number'],
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    refundedExternally: {
      type: Boolean,
    },

    // — Phase 4 auto-settle envelope.
    settlementStatus: {
      type: String,
      enum: [...SETTLEMENT_STATUSES],
    },
    settlementPaymentIntents: {
      type: [
        new Schema<SettlementTransaction>(
          {
            id: { type: String, required: true, trim: true },
            amount: { type: Number, required: true, min: 0 },
            kind: { type: String, required: true, enum: [...SETTLEMENT_KINDS] },
            createdAt: { type: Date, required: true, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    settlementError: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const OrderSchema = new Schema<Order>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    guestContact: {
      type: new Schema<GuestContact>(
        {
          name: { type: String, required: true, trim: true },
          email: { type: String, required: true, trim: true, lowercase: true },
          phone: { type: String, trim: true },
        },
        { _id: false },
      ),
    },
    orderItems: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be a positive number'],
    },
    tax: {
      type: Number,
      required: [true, 'Tax is required'],
      min: [0, 'Tax must be a positive number'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost must be a positive number'],
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    orderStatus: {
      type: String,
      required: true,
      default: 'Order Placed',
      enum: [...ORDER_STATUSES],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: [...PAYMENT_METHODS],
    },
    paymentResult: {
      type: PaymentResultSchema,
      required: true,
    },
    pickupLocation: {
      type: String,
      required: [true, 'Pickup location is required'],
      trim: true,
    },
    pickedUp: {
      type: Boolean,
      default: false,
    },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    fulfillmentType: { type: String, enum: ['pickup', 'delivery'] },
    pickupSlot: { type: String, trim: true },
    deliveryAddress: {
      type: new Schema<DeliveryAddressData>(
        {
          address1: { type: String, trim: true },
          address2: { type: String, trim: true },
          city: { type: String, trim: true },
          state: { type: String, trim: true },
          zip: { type: String, trim: true },
        },
        { _id: false },
      ),
    },
    orderNotes: { type: String, trim: true },
    cancellationReason: { type: String, enum: [...CANCELLATION_REASONS] },
    readyAt: { type: Date },
    pickedUpAt: { type: Date },
    cancelledAt: { type: Date },
    pointsAwarded: { type: Number, default: 0, min: 0 },
    pointsRedeemed: { type: Number, default: 0, min: 0 },
    pointsRedemptionValueCents: { type: Number, default: 0, min: 0 },
    pointsRedemptionReturned: { type: Number, default: 0, min: 0 },
    memberDiscount: { type: Number, default: 0, min: 0 },
    promoDiscount: { type: Number, default: 0, min: 0 },
    promoCode: { type: String, trim: true },
    promoId: { type: Schema.Types.ObjectId, ref: 'Promo' },
    saveCardIntent: { type: Boolean },
    savedCardIdAtPurchase: { type: String, trim: true },
    autoSettleAtPickup: { type: Boolean },
  },
  {
    timestamps: true,
  },
);

// Every order needs an owner — either a registered user or a typed-in guest
// contact. Phase 4's claim-on-signup attaches a registered user to a prior
// guest order, so after the claim an order may have *both* fields set — that
// is intentional (the guestContact stays as an audit trail of how the order
// was placed). The rule we enforce is "at least one", not "exactly one".
//
// A path-level validator on `user` would be skipped by Mongoose when the path
// is undefined; a pre-save hook always fires, so guest orders (no `user`) are
// still checked.
OrderSchema.pre('save', function () {
  const hasUser = Boolean(this.user);
  const hasGuestContact = Boolean(this.guestContact?.email);
  if (!hasUser && !hasGuestContact) {
    throw new Error('Order must have either user or guestContact');
  }
});

// Partial index on guestContact.email — only over guest orders. Phase 4's
// claim-on-signup queries `{ user: null, "guestContact.email": <newUserEmail> }`
// to attach prior guest orders to a freshly registered account; without this
// the claim step degrades to a collection scan as guest orders accumulate.
OrderSchema.index(
  { 'guestContact.email': 1 },
  { partialFilterExpression: { user: null } },
);

// Customer "My Orders" history + admin filter-by-customer both query by user
// and sort by createdAt desc. Compound index covers both halves so neither
// page scans the collection as orders accumulate.
OrderSchema.index({ user: 1, createdAt: -1 });

// Admin orders dashboard + admin GET /api/orders both filter on a createdAt
// range and sort by createdAt desc. The (user, createdAt) compound above
// can't serve unfiltered admin reads. Pill filtering on isPaid/orderStatus
// is applied client-side over the 200-row prefetch, so a leading-isPaid
// compound earns nothing here.
OrderSchema.index({ createdAt: -1 });

// In dev, Next.js hot-reload keeps `mongoose.models.Order` cached on the
// global Mongoose singleton even after this file is re-evaluated. That
// makes schema additions (e.g. new fields) invisible at runtime — the old
// model wins and Mongoose silently drops the unknown fields on insert.
// Delete the cached model in dev so the schema is always re-registered
// with the latest paths. Production keeps the cache (no schema churn).
if (process.env.NODE_ENV !== 'production' && models.Order) {
  delete (models as Record<string, unknown>).Order;
}

const OrderModel =
  (models.Order as Model<Order> | undefined) ||
  model<Order>('Order', OrderSchema);

export default OrderModel;
