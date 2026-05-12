import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export const NOTIFICATION_TYPES = ['new_order', 'low_stock', 'new_event'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  type: NotificationType;
  title: string;
  body: string;
  userId: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type NotificationDocument = HydratedDocument<Notification>;

const NotificationSchema = new Schema<Notification>(
  {
    type: {
      type: String,
      enum: [...NOTIFICATION_TYPES],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body:  { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound index: fast "unread for admin" queries
NotificationSchema.index({ userId: 1, createdAt: -1 });

const NotificationModel =
  (models.Notification as Model<Notification> | undefined) ??
  model<Notification>('Notification', NotificationSchema);

export default NotificationModel;
