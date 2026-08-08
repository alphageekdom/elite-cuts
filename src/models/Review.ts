import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

export type Review = {
  user: Types.ObjectId | null;
  product: Types.ObjectId;
  rating: number;
  comment: string;
  authorNameSnapshot: string;
  // Users who marked this review helpful. Stored as the voter set rather than
  // a bare counter so "one vote per user" is enforced structurally ($addToSet /
  // $pull) and the current viewer's vote state is derivable without a second
  // collection. Count = length.
  helpfulVoters: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewDocument = HydratedDocument<Review>;

const ReviewSchema = new Schema<Review>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    authorNameSnapshot: {
      type: String,
      trim: true,
      default: '',
    },
    helpfulVoters: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// One review per user per product — only enforced for rows still tied to an
// active user. Anonymized rows (user: null) are exempt so a single product can
// hold multiple "Former customer" reviews.
ReviewSchema.index(
  { user: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  },
);

// Every product page lists its reviews, and every review create / edit / delete
// re-runs the rating aggregate — both filter on `product` alone, which the
// user-leading unique index above cannot serve.
//
// Declared here rather than added by hand in Atlas because a hand-added index is
// invisible to code review and to every other environment. The original reason
// given was stronger and is no longer true: it said the `syncIndexes()` below
// would revert an out-of-band index on the next cold start. That call was
// removed on 2026-08-07 (see the note further down), so nothing reverts anything
// now — the argument is convention, not enforcement.
ReviewSchema.index({ product: 1, createdAt: -1 });

if (process.env.NODE_ENV !== 'production' && models.Review) {
  delete (models as Record<string, unknown>).Review;
}

const ReviewModel =
  (models.Review as Model<Review> | undefined) ||
  model<Review>('Review', ReviewSchema);

// Do not re-add the `syncIndexes()` call that used to run here on module load;
// the 2026-08-07 database audit removed it. It performed a one-time migration
// (swapping this model's unique index to the partial-filter form above, which
// autoIndex cannot do because it only ever adds). That migration is finished —
// the live collection was listed before removal and holds exactly the two
// indexes declared above — so the call had become a no-op that still DROPPED any
// index absent from the schema on every cold start.
//
// What maintains these indexes now: `autoIndex`, which `src/config/database.ts`
// enables outside production. Local development and production share one Atlas
// database, so a local run builds anything declared here. That is load-bearing
// and easy to break — on a genuinely separate production database nothing would
// build these at all.

export default ReviewModel;
