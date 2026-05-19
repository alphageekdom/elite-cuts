import mongoose, {
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

if (process.env.NODE_ENV !== 'production' && models.Review) {
  delete (models as Record<string, unknown>).Review;
}

const ReviewModel =
  (models.Review as Model<Review> | undefined) ||
  model<Review>('Review', ReviewSchema);

// Account-deletion swap: the unique index moved from `{user, product}` strict
// to a partial filter on `user: { $type: 'objectId' }`. Mongoose's autoIndex
// only *adds* indexes — it won't drop the old strict one — so a dev DB built
// before the swap keeps both indexes and rejects anonymized rows.
//
// Run syncIndexes() once per process to drop diverged indexes and rebuild
// the schema-current set. Guarded by a globalThis flag so hot-reloads don't
// pile listeners.
//
// **Production migration:** the prod guard runs the sync there too, but only
// the first cold start after this change deploys actually changes anything —
// every subsequent start sees the indexes already in sync and the call is a
// no-op. If a deploy environment forbids index changes at boot, drop the
// strict index manually one time with:
//
//   db.reviews.dropIndex({ user: 1, product: 1 })
//
// and the next request will rebuild the partial-filter version via autoIndex.
declare global {
  var __reviewIndexesSyncRequested: boolean | undefined;
}

if (!globalThis.__reviewIndexesSyncRequested) {
  globalThis.__reviewIndexesSyncRequested = true;
  const syncReviewIndexes = () => {
    ReviewModel.syncIndexes().catch((err) => {
      console.error('[Review] syncIndexes failed:', err);
    });
  };
  if (mongoose.connection.readyState === 1) {
    syncReviewIndexes();
  } else {
    mongoose.connection.once('connected', syncReviewIndexes);
  }
}

export default ReviewModel;
