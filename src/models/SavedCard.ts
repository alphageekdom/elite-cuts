import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

// Stub-mode-only mirror of Stripe's saved-card list. In real Stripe mode the
// hosted Checkout page is the source of truth and we read cards directly from
// `stripe.customers.listPaymentMethods` — this collection is never written and
// queries skip it. It exists so the local demo (no Stripe key) can still show
// a populated Payment methods tab after a mock checkout.
export type SavedCard = {
  user: Types.ObjectId;
  stubCardId: string;
  cardholderName?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SavedCardDocument = HydratedDocument<SavedCard>;

const SavedCardSchema = new Schema<SavedCard>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stubCardId: {
      type: String,
      required: true,
      unique: true,
    },
    cardholderName: { type: String, trim: true },
    brand: { type: String, required: true, trim: true },
    last4: { type: String, required: true, trim: true },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true },
  },
  { timestamps: true },
);

// Dedupe: a single customer shouldn't accumulate the same (brand, last4,
// expiry) combination — that's the same physical card saved twice. Editing
// expiry on an existing row goes through PATCH, not POST, so updating won't
// collide with itself.
SavedCardSchema.index(
  { user: 1, brand: 1, last4: 1, expMonth: 1, expYear: 1 },
  { unique: true },
);

if (process.env.NODE_ENV !== 'production' && models.SavedCard) {
  delete (models as Record<string, unknown>).SavedCard;
}

const SavedCardModel =
  (models.SavedCard as Model<SavedCard> | undefined) ||
  model<SavedCard>('SavedCard', SavedCardSchema);

export default SavedCardModel;
