import { Schema, model, models, type Model } from 'mongoose';

export type AgingCut = {
  cut: string;
  targetDays: number;
  rack: string;
  weightLb: number;
  startedAt: Date;
  isActive: boolean;
};

const AgingCutSchema = new Schema<AgingCut>(
  {
    cut: { type: String, required: true, trim: true },
    targetDays: { type: Number, default: 28 },
    rack: { type: String, default: '' },
    weightLb: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const AgingCutModel =
  (models.AgingCut as Model<AgingCut> | undefined) ??
  model<AgingCut>('AgingCut', AgingCutSchema);

export default AgingCutModel;
