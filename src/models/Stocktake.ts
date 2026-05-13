import { Schema, model, models, type Model, type Types } from 'mongoose';

export type StocktakeEntry = {
  productId: Types.ObjectId;
  previousStock: number;
  countedStock: number;
  delta: number;
};

export type Stocktake = {
  startedBy: Types.ObjectId;
  entries: StocktakeEntry[];
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

const StocktakeEntrySchema = new Schema<StocktakeEntry>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    previousStock: { type: Number, required: true, min: 0 },
    countedStock: { type: Number, required: true, min: 0 },
    delta: { type: Number, required: true },
  },
  { _id: false },
);

const StocktakeSchema = new Schema<Stocktake>(
  {
    startedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entries: { type: [StocktakeEntrySchema], default: [] },
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

// Listing the most-recent stocktake for the subtitle is the hot path.
StocktakeSchema.index({ createdAt: -1 });

const StocktakeModel =
  (models.Stocktake as Model<Stocktake> | undefined) ??
  model<Stocktake>('Stocktake', StocktakeSchema);

export default StocktakeModel;
