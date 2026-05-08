import { Schema, model, models, type Model } from 'mongoose';

export const DELIVERY_STATUSES = ['confirmed', 'pending', 'scheduled'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type Delivery = {
  deliveryDate: Date;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: DeliveryStatus;
};

const DeliverySchema = new Schema<Delivery>(
  {
    deliveryDate:   { type: Date, required: true },
    supplier:       { type: String, required: true, trim: true },
    supplierSuffix: { type: String, default: '', trim: true },
    detail:         { type: String, default: '', trim: true },
    status:         { type: String, enum: [...DELIVERY_STATUSES], default: 'scheduled' },
  },
  { timestamps: true },
);

const DeliveryModel =
  (models.Delivery as Model<Delivery> | undefined) ??
  model<Delivery>('Delivery', DeliverySchema);

export default DeliveryModel;
