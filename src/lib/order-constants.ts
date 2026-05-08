export const ORDER_STATUSES = [
  'Order Placed',
  'Preparing',
  'Ready for Pickup',
  'Out for Delivery',
  'Completed',
  'Cancelled',
] as const;

export const CANCELLATION_REASONS = [
  'Customer Request',
  'Out of Stock',
  'Cannot Deliver',
  'Other',
] as const;
