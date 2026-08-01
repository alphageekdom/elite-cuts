import type { Types } from 'mongoose';
import type { MessageStatus } from '@/lib/messages/constants';
import { FORMER_CUSTOMER_NAME } from '@/lib/auth/account-deletion-constants';

// Pure derivation the admin messages page uses to turn populated message
// documents into client rows. Lifted out of the page so the page reads as
// query + assembly — same shape as the inventory / analytics derivations
// recent audits moved here.

export type PopulatedUser = { _id: Types.ObjectId; name: string; email: string };

type RawMessage = {
  _id: Types.ObjectId;
  user: PopulatedUser | Types.ObjectId | null;
  authorNameSnapshot?: string;
  subject: string;
  body: string;
  orderRef?: string;
  status: MessageStatus;
  createdAt: Date;
};

// The shape of one row on the admin messages dashboard. Consumed by
// MessagesClient (and its sub-components: MessageCard, MessageTableRow,
// MessageDrawer) plus the server page that builds the list.
export type MessageRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  body: string;
  orderRef?: string;
  status: MessageStatus;
  createdAt: string;
};

function isPopulated(user: RawMessage['user']): user is PopulatedUser {
  return Boolean(user) && typeof user === 'object' && 'email' in (user as object);
}

export function buildMessageRow(m: RawMessage): MessageRow {
  const user = isPopulated(m.user) ? m.user : null;
  // Soft-deleted users are anonymised via the snapshot; if the snapshot is
  // missing (very old messages from before the field landed), fall back to a
  // generic "Former customer" label so the row still reads cleanly.
  const snapshot = (m.authorNameSnapshot ?? '').trim();
  const fallbackName = snapshot || FORMER_CUSTOMER_NAME;
  return {
    id: String(m._id),
    customerName: user?.name ?? fallbackName,
    customerEmail: user?.email ?? '',
    subject: m.subject,
    body: m.body,
    orderRef: m.orderRef,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  };
}
