import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';
import { MESSAGE_STATUSES, type MessageStatus } from '@/lib/messages/constants';

// The type is re-exported for the one consumer that still reaches for it here;
// everything else imports from `@/lib/messages/constants`, which is where new
// code should go when it only needs the enum or the type.
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
    // No field-level index — the (user, createdAt) compound below is
    // user-leading and serves every user-only predicate too.
    user:               { type: Schema.Types.ObjectId, ref: 'User', default: null },
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
