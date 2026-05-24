import { Schema, model, models, type Model, type Types } from 'mongoose';

import { DELIVERY_STATUSES, type DeliveryStatus } from '@/lib/deliveries/constants';

// Re-exported for back-compat with anything still importing the enum from
// the model path. New code should import from `@/lib/deliveries/constants`
// directly to stay out of the client bundle.
export { DELIVERY_STATUSES, type DeliveryStatus };

export type Delivery = {
  deliveryDate: Date;
  supplier: string;
  supplierSuffix: string;
  detail: string;
  status: DeliveryStatus;
  productId?: Types.ObjectId;
  receivedQty?: number;
};

const DeliverySchema = new Schema<Delivery>(
  {
    deliveryDate:   { type: Date, required: true },
    supplier:       { type: String, required: true, trim: true },
    supplierSuffix: { type: String, default: '', trim: true },
    detail:         { type: String, default: '', trim: true },
    status:         { type: String, enum: [...DELIVERY_STATUSES], default: 'scheduled' },
    productId:      { type: Schema.Types.ObjectId, ref: 'Product', index: true },
    receivedQty:    { type: Number, min: 0 },
  },
  { timestamps: true },
);

const DeliveryModel =
  (models.Delivery as Model<Delivery> | undefined) ??
  model<Delivery>('Delivery', DeliverySchema);

export default DeliveryModel;
