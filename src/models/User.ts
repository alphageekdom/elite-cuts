import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

import type { Address } from '@/types/address';

export const POINTS_HISTORY_REASONS = [
  'order_fulfilled',
  'redemption',
  'cancel_reverse',
  'refund_reverse',
  'admin_adjustment',
  'expired',
] as const;

export type PointsHistoryReason = (typeof POINTS_HISTORY_REASONS)[number];

export type PointsHistoryEntry = {
  delta: number;
  reason: PointsHistoryReason;
  orderId?: Types.ObjectId;
  expiresAt?: Date | null;
  createdAt: Date;
};

export const TIER_VALUES = ['regular', 'connoisseur', 'masterCut'] as const;
export type TierValue = (typeof TIER_VALUES)[number];

export const DEMO_TYPES = ['customer', 'admin'] as const;
export type DemoType = (typeof DEMO_TYPES)[number];

export type User = {
  name: string;
  email: string;
  // `select: false` in the schema — absent from every read that doesn't opt in
  // with `.select('+password')`, so the type has to allow that. Typing it as a
  // present `string` meant a plain `findById` result compiled straight into
  // `bcrypt.compare(input, user.password)` and blew up at runtime.
  password?: string;
  phone?: string;
  savedCuts: Types.ObjectId[];
  addresses: Types.DocumentArray<Address>;
  isAdmin: boolean;
  rewardPoints: number;
  lifetimePoints: number;
  pointsHistory: PointsHistoryEntry[];
  // Phase D2 tier-retention fields. Undefined on legacy users; the
  // rewards-view helper lazy-backfills them on first tier-aware read
  // (tierAnniversaryAt ?? user.createdAt; currentTier ← reassessment result).
  tierAnniversaryAt?: Date;
  currentTier?: TierValue;
  adminNote?: string;
  // Also `select: false` — same reason as `password` above. `lockoutUntil`,
  // the third select-false field, was already typed honestly.
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  deletedAt?: Date | null;
  deletionScheduledFor?: Date | null;
  lastActiveAt?: Date | null;
  dormancyWarnedAt?: Date | null;
  // Lazily created on the user's first checkout (real Stripe mode only); stays
  // undefined for stub-mode customers and for users who have never checked out.
  stripeCustomerId?: string;
  // Demo accounts seeded for the portfolio demo experience. Both flags are
  // immutable after creation so a tampered admin call can't promote a real
  // account into the demo block-list. `demoType` discriminates the demo path
  // for routing (customer → /products, admin → /admin) and is unrelated to
  // `isAdmin`, which still gates real admin permissions.
  isDemo: boolean;
  demoType?: DemoType;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDocument = HydratedDocument<User>;

const AddressSchema = new Schema<Address>(
  {
    label: { type: String, required: true, trim: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    savedCuts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    phone: { type: String, trim: true },
    addresses: [AddressSchema],
    isAdmin: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    rewardPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsHistory: {
      type: [
        new Schema<PointsHistoryEntry>(
          {
            delta: { type: Number, required: true },
            reason: {
              type: String,
              required: true,
              enum: [...POINTS_HISTORY_REASONS],
            },
            orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
            expiresAt: { type: Date, default: null },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    tierAnniversaryAt: { type: Date },
    currentTier: {
      type: String,
      enum: [...TIER_VALUES],
    },
    adminNote: {
      type: String,
      trim: true,
      default: '',
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockoutUntil: {
      type: Date,
      default: null,
      select: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletionScheduledFor: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    dormancyWarnedAt: {
      type: Date,
      default: null,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
    },
    isDemo: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    demoType: {
      type: String,
      enum: [...DEMO_TYPES],
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Admin customers dashboard sorts by createdAt desc for "newest first".
// Without this index the sort triggers an in-memory scan once the users
// collection passes a few thousand rows.
UserSchema.index({ createdAt: -1 });

// See the matching note in models/Order.ts — Next.js dev hot-reload caches
// the registered model on the Mongoose singleton, so schema additions
// (e.g. lifetimePoints, pointsHistory) get silently dropped on writes
// until the dev server is fully cycled. Force re-registration in dev so
// schema additions always take effect.
if (process.env.NODE_ENV !== 'production' && models.User) {
  delete (models as Record<string, unknown>).User;
}

const UserModel =
  (models.User as Model<User> | undefined) || model<User>('User', UserSchema);

export default UserModel;