import { formatMoney } from './admin-utils';
import type { OrderTableRow } from '@/types/admin';

export function printReceipt(order: OrderTableRow) {
  const w = window.open('', '_blank', 'width=480,height=700');
  if (!w) return;

  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;border-bottom:1px solid #eee">${item.name} × ${item.qty}</td>
          <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${formatMoney(item.price * item.qty)}</td>
        </tr>`,
    )
    .join('');

  w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${order.orderRef}</title>
    <style>
      body{font-family:system-ui,sans-serif;max-width:400px;margin:32px auto;color:#1C1814;font-size:13px}
      h1{font-size:22px;margin:0 0 4px}
      .muted{color:#8A7F73;font-size:11px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      .total{font-size:17px;font-weight:600}
      @media print{body{margin:0}}
    </style></head><body>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:11px;letter-spacing:.15em;color:#8A7F73;margin-bottom:4px">ELITECUTS · SAN DIEGO, CA</div>
      <h1>${order.orderRef}</h1>
      <div class="muted">${order.customerName} · ${order.customerEmail}</div>
    </div>
    <table>${itemRows}</table>
    <div style="display:flex;justify-content:space-between;margin:4px 0"><span class="muted">Subtotal</span><span>${formatMoney(order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between;margin:4px 0"><span class="muted">Tax</span><span>${formatMoney(order.tax)}</span></div>
    <div style="display:flex;justify-content:space-between;margin:12px 0;padding-top:10px;border-top:2px solid #1C1814">
      <span class="total">Total</span><span class="total">${formatMoney(order.total)}</span>
    </div>
    <div style="text-align:center;margin-top:24px;color:#8A7F73;font-size:11px">
      Pickup · ${order.pickupLocation || 'San Diego, CA'} · Status: ${order.status}
    </div>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
    </body></html>`);
  w.document.close();
}
