import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export const PROMO_TYPES = ['percent', 'fixed'] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const PROMO_FAILURE_REASONS = [
  'not_found',
  'disabled',
  'not_started',
  'expired',
  'exhausted',
  'customer_limit',
  'min_subtotal',
  'first_order_only',
] as const;
export type PromoFailureReason = (typeof PROMO_FAILURE_REASONS)[number];

export type Promo = {
  code: string;
  description?: string;
  type: PromoType;
  // percent: 1-100 (whole numbers). fixed: cents.
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
  startsAt?: Date;
  endsAt?: Date;
  usageLimit?: number;
  usageCount: number;
  perCustomerLimit?: number;
  firstOrderOnly: boolean;
  excludesPoints: boolean;
  excludesMember: boolean;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PromoDocument = HydratedDocument<Promo>;

const PromoSchema = new Schema<Promo>(
  {
    code: {
      type: String,
      required: [true, 'Code is required'],
      uppercase: true,
      trim: true,
      unique: true,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: [...PROMO_TYPES],
    },
    value: {
      type: Number,
      required: [true, 'Value is required'],
      min: [0, 'Value must be a positive number'],
    },
    minSubtotal: { type: Number, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    usageLimit: { type: Number, min: 0 },
    usageCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, min: 0, default: 1 },
    firstOrderOnly: { type: Boolean, default: false },
    // Default true per the stacking rule — a promo blocks points redemption
    // unless an admin explicitly opts the campaign into stacking.
    excludesPoints: { type: Boolean, default: true },
    excludesMember: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Active-and-current lookups for admin filters and any "currently usable"
// queries. Partial filter keeps the index narrow by only covering rows that
// can actually be redeemed.
PromoSchema.index(
  { isActive: 1, endsAt: 1 },
  { partialFilterExpression: { isActive: true } },
);

if (process.env.NODE_ENV !== 'production' && models.Promo) {
  delete (models as Record<string, unknown>).Promo;
}

const PromoModel =
  (models.Promo as Model<Promo> | undefined) ||
  model<Promo>('Promo', PromoSchema);

export default PromoModel;
