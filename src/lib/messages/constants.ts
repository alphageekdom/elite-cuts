// Lives separate from `@/models/Message` so the messages Zod schema can be
// imported from the client bundle (NewMessageModal) without dragging mongoose
// in. The model file re-exports these for backwards compatibility.

export const MESSAGE_STATUSES = ['open', 'closed'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
