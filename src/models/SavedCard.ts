import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type Model,
  type Types,
} from 'mongoose';

// Local mirror of a customer's saved cards, written by the stub checkout the
// portfolio demo runs without Stripe credentials.
//
// Read in BOTH modes, not just stub mode: `lib/payments/savedCards.ts` merges
// these rows with the payment methods Stripe reports, so a card saved through
// the demo path stays visible on the Payment methods tab once a real Stripe key
// is configured, and the per-card get/delete helpers route `card_`-prefixed ids
// here regardless of mode. (This header used to claim the collection was never
// read outside stub mode, which stopped being true when the merge shipped —
// acting on it would have meant dropping a collection the live read path needs.)
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
    // No field-level index — the unique compound below is user-leading and
    // serves the by-owner lookup too.
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
