import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'new_order',
  'low_stock',
  'new_event',
  'settlement_failed',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type Notification = {
  type: NotificationType;
  title: string;
  body: string;
  userId: Types.ObjectId;
  // Defaults to `null`, not undefined — the unread queries filter on
  // `readAt: null`, so an `=== undefined` check would miss every row.
  readAt?: Date | null;
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
    // No field-level index — both compounds below are userId-leading and
    // serve a userId-only predicate as well.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Compound index: fast feed queries (user's notifications sorted by recency).
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Navbar unread-badge polls count of `{ userId, readAt: null }`. The plain
// (userId, createdAt) index can't satisfy that without scanning all of the
// user's notifications, so add a covering compound for the unread filter.
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const NotificationModel =
  (models.Notification as Model<Notification> | undefined) ??
  model<Notification>('Notification', NotificationSchema);

export default NotificationModel;
