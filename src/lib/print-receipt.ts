import type { OrderTableRow } from '@/types/admin';

// Opens the branded receipt page in a new tab.
// The receipt page at /receipt/[id] renders the full design and lets the user
// print or save as PDF via the toolbar — no auto-print dialog.
export function printReceipt(order: OrderTableRow) {
  window.open(`/receipt/${order.id}`, '_blank');
}
