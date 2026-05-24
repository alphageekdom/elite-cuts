// Client-safe enum + type extracted from `@/models/Delivery` so the
// deliveries Zod schema (and any drawer that imports it) can pull
// `DELIVERY_STATUSES` without dragging mongoose into the client bundle.
// The model re-exports these for back-compat with anything still reaching
// in by the old path.

export const DELIVERY_STATUSES = ['confirmed', 'pending', 'scheduled', 'received'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
