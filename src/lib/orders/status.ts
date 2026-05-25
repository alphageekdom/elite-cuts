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
  'Preparing':        'bg-camel/15 text-camel',
  'Ready for Pickup': 'bg-camel/15 text-camel',
  'Out for Delivery': 'bg-camel/15 text-camel',
  'Completed':        'bg-green-soft text-green',
  'Cancelled':        'bg-red-soft text-oxblood',
};

export const RECEIPT_ORDER_STATUS_STYLES: Record<string, string> = {
  'Order Placed':     'bg-camel/18 text-camel',
  'Preparing':        'bg-camel/18 text-camel',
  'Ready for Pickup': 'bg-camel/18 text-camel',
  'Out for Delivery': 'bg-ink/10 text-ink',
  'Completed':        'bg-green-soft text-green',
  'Cancelled':        'bg-red-soft text-oxblood',
};

export type TableOrderStatusPill = {
  bg: string;
  text: string;
  label: string;
};

export const TABLE_ORDER_STATUS_PILL: Record<string, TableOrderStatusPill> = {
  'Order Placed':     { bg: 'bg-line-soft',  text: 'text-muted',    label: 'Order Placed' },
  'Preparing':        { bg: 'bg-camel/18',   text: 'text-camel',    label: 'Preparing' },
  'Ready for Pickup': { bg: 'bg-camel/18',   text: 'text-camel',    label: 'Ready' },
  'Out for Delivery': { bg: 'bg-camel/18',   text: 'text-camel',    label: 'Out for Delivery' },
  'Completed':        { bg: 'bg-green-soft', text: 'text-green',    label: 'Completed' },
  'Cancelled':        { bg: 'bg-red-soft',   text: 'text-oxblood',  label: 'Cancelled' },
};
