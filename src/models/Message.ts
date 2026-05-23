import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';
import { MESSAGE_STATUSES, type MessageStatus } from '@/lib/messages/constants';

// Re-export so existing consumers (MessagesClient, the [id] route, etc.)
// keep their import paths working. New code should pull from
// `@/lib/messages/constants` directly when only the enum/type is needed.
export { MESSAGE_STATUSES };
export type { MessageStatus };

export type Message = {
  user: Types.ObjectId | null;
  authorNameSnapshot: string;
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
    user:               { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    authorNameSnapshot: { type: String, trim: true, default: '' },
    subject:            { type: String, required: true, trim: true, maxlength: 120 },
    body:               { type: String, required: true, trim: true, maxlength: 2000 },
    orderId:            { type: Schema.Types.ObjectId, ref: 'Order' },
    orderRef:           { type: String, trim: true, maxlength: 100 },
    status:             { type: String, enum: [...MESSAGE_STATUSES], default: 'open' },
  },
  { timestamps: true },
);

MessageSchema.index({ user: 1, createdAt: -1 });

if (process.env.NODE_ENV !== 'production' && models.Message) {
  delete (models as Record<string, unknown>).Message;
}

const MessageModel =
  (models.Message as Model<Message> | undefined) ??
  model<Message>('Message', MessageSchema);

export default MessageModel;
