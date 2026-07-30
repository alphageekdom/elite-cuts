// Each surface uses its own palette intentionally — the receipt and order
// row settled on different treatments for "Order Placed" (camel vs line)
// and "Out for Delivery" (ink vs camel). This module collects the three
// variants so adding a new status touches one file instead of three.

const SHORT_LABELS: Record<string, string> = {
  'Order Placed':     'Placed',
  'Preparing':        'Preparing',
  'Ready for Pickup': 'Ready',
  'Out for Delivery': 'Out',
  'Completed':        'Completed',
  'Cancelled':        'Cancelled',
};

export function getDashboardOrderStatusLabel(status: string): string {
  return SHORT_LABELS[status] ?? status;
}

export const DASHBOARD_ORDER_STATUS_STYLES: Record<string, string> = {
  'Order Placed':     'bg-line-soft text-ink-soft',
  'Preparing':        'bg-camel/15 text-camel-deep',
  'Ready for Pickup': 'bg-camel/15 text-camel-deep',
  'Out for Delivery': 'bg-camel/15 text-camel-deep',
  'Completed':        'bg-green-soft text-green',
  'Cancelled':        'bg-red-soft text-oxblood',
};

export const RECEIPT_ORDER_STATUS_STYLES: Record<string, string> = {
  'Order Placed':     'bg-camel/18 text-camel-deep',
  'Preparing':        'bg-camel/18 text-camel-deep',
  'Ready for Pickup': 'bg-camel/18 text-camel-deep',
  'Out for Delivery': 'bg-ink/10 text-ink',
  'Completed':        'bg-green-soft text-green',
  'Cancelled':        'bg-red-soft text-oxblood',
};

// The customer-facing profile palette. Was a fourth copy living as a private
// `statusChip` switch inside ProfileOrderList — exactly the drift this module
// exists to prevent — so it moves here with its existing colours intact.
export const PROFILE_ORDER_STATUS_STYLES: Record<string, string> = {
  'Order Placed':     'bg-ink/10 text-muted',
  'Preparing':        'bg-ink/10 text-muted',
  'Ready for Pickup': 'bg-camel/15 text-camel-deep',
  'Out for Delivery': 'bg-camel/15 text-camel-deep',
  'Completed':        'bg-green/10 text-green',
  'Cancelled':        'bg-oxblood/10 text-oxblood',
};

export type TableOrderStatusPill = {
  bg: string;
  text: string;
  label: string;
};

export const TABLE_ORDER_STATUS_PILL: Record<string, TableOrderStatusPill> = {
  'Order Placed':     { bg: 'bg-line-soft',  text: 'text-muted',    label: 'Order Placed' },
  'Preparing':        { bg: 'bg-camel/18',   text: 'text-camel-deep',    label: 'Preparing' },
  'Ready for Pickup': { bg: 'bg-camel/18',   text: 'text-camel-deep',    label: 'Ready' },
  'Out for Delivery': { bg: 'bg-camel/18',   text: 'text-camel-deep',    label: 'Out for Delivery' },
  'Completed':        { bg: 'bg-green-soft', text: 'text-green',    label: 'Completed' },
  'Cancelled':        { bg: 'bg-red-soft',   text: 'text-oxblood',  label: 'Cancelled' },
};

// Dark-surface variant, for the dashboard cut list sitting on `bg-ink`.
// The light palettes above all fail on it — `text-green` at 4.9:1 on cream
// drops to 1.9:1 on ink, and `text-ink-soft` disappears entirely. These use
// the bright/soft tokens the rewards contrast sweep introduced for exactly
// this case, so a dark surface never hand-rolls its own rgba again.
export const CUTLIST_ORDER_STATUS_PILL: Record<string, TableOrderStatusPill> = {
  'Order Placed':     { bg: 'bg-cream/10',       text: 'text-cream/75',  label: 'Placed' },
  'Preparing':        { bg: 'bg-camel/20',       text: 'text-camel-soft', label: 'Preparing' },
  'Ready for Pickup': { bg: 'bg-green-bright/15', text: 'text-green-bright', label: 'Ready' },
  'Out for Delivery': { bg: 'bg-green-bright/15', text: 'text-green-bright', label: 'Out for delivery' },
  'Completed':        { bg: 'bg-cream/8',        text: 'text-cream/55',  label: 'Collected' },
  'Cancelled':        { bg: 'bg-oxblood/30',     text: 'text-cream/80',  label: 'Cancelled' },
};
