import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export const MESSAGE_STATUSES = ['open', 'closed'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export type Message = {
  user: Types.ObjectId;
  subject: string;
  body: string;
  orderId?: Types.ObjectId;
  orderRef?: string;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageDocument = HydratedDocument<Message>;

const MessageSchema = new Schema<Message>(
  {
    user:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject:  { type: String, required: true, trim: true, maxlength: 120 },
    body:     { type: String, required: true, trim: true, maxlength: 2000 },
    orderId:  { type: Schema.Types.ObjectId, ref: 'Order' },
    orderRef: { type: String, trim: true, maxlength: 100 },
    status:   { type: String, enum: [...MESSAGE_STATUSES], default: 'open' },
  },
  { timestamps: true },
);

MessageSchema.index({ user: 1, createdAt: -1 });

const MessageModel =
  (models.Message as Model<Message> | undefined) ??
  model<Message>('Message', MessageSchema);

export default MessageModel;
