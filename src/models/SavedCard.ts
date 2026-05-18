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
    brand: { type: String, required: true, trim: true },
    last4: { type: String, required: true, trim: true },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== 'production' && models.SavedCard) {
  delete (models as Record<string, unknown>).SavedCard;
}

const SavedCardModel =
  (models.SavedCard as Model<SavedCard> | undefined) ||
  model<SavedCard>('SavedCard', SavedCardSchema);

export default SavedCardModel;
