import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import { ORDER_STATUSES, CANCELLATION_REASONS } from '@/lib/order-constants';
export { ORDER_STATUSES, CANCELLATION_REASONS };

export const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Apple Pay',
  'Google Pay',
  'PayPal',
  'Crypto',
  'Demo',
  'Card or wallet',
] as const;

export const PAYMENT_STATUSES = [
  'Pending',
  'Authorized',
  'Completed',
  'Failed',
  'Partially Refunded',
  'Refunded',
] as const;

export const PAYMENT_PROVIDERS = ['stripe', 'paypal', 'demo'] as const;

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
  price: number;
  productType: string;
  refunded: boolean;
  refundedAt?: Date;
};

export type PaymentResult = {
  status: PaymentStatus;
  provider: PaymentProvider;
  transactionId?: string;
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
  user?: Types.ObjectId;
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
    transactionId: {
      type: String,
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
