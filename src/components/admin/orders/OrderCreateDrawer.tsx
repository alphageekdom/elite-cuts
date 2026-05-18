'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TAX_RATE } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shopConfig';
import { fmtPrice } from '@/lib/pricing';
import { getInitials } from '@/lib/format';

export type AdminOrderCustomer = {
  id: string;
  name: string;
  email: string;
};

export type AdminOrderProduct = {
  id: string;
  name: string;
  price: number;
  stockCount: number;
  image: string;
  category?: string;
};

type LineItem = {
  productId: string;
  qty: number;
};

type InitialStatus = 'Order Placed' | 'Completed';

const STATUS_OPTIONS: { value: InitialStatus; label: string; helper: string }[] = [
  {
    value: 'Order Placed',
    label: 'Order placed',
    helper: 'Pending payment, customer will pick up later.',
  },
  {
    value: 'Completed',
    label: 'Completed (offline-paid)',
    helper: 'Cash or card at counter — order is paid and picked up.',
  },
];

type Props = {
  customers: AdminOrderCustomer[];
  products: AdminOrderProduct[];
  defaultPickupLocation: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function OrderCreateDrawer({
  customers,
  products,
  defaultPickupLocation,
  onClose,
  onCreated,
}: Props) {
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [pickupLocation, setPickupLocation] = useState(defaultPickupLocation);
  const [pickupSlot, setPickupSlot] = useState('');
  const [orderStatus, setOrderStatus] = useState<InitialStatus>('Order Placed');
  const [submitting, setSubmitting] = useState(false);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return customers.slice(0, 8);
    const q = customerQuery.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, customerQuery]);

  const filteredProducts = useMemo(() => {
    const alreadyAdded = new Set(lines.map((l) => l.productId));
    const pool = products.filter((p) => !alreadyAdded.has(p.id));
    if (!productQuery.trim()) return pool.slice(0, 8);
    const q = productQuery.toLowerCase();
    return pool
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [products, productQuery, lines]);

  const selectedCustomer = customerId ? customers.find((c) => c.id === customerId) ?? null : null;

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => {
      const p = productMap.get(l.productId);
      return sum + (p ? p.price * l.qty : 0);
    }, 0);
    const tax = subtotal * TAX_RATE;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100,
    };
  }, [lines, productMap]);

  function addProduct(productId: string) {
    setLines((prev) => [...prev, { productId, qty: 1 }]);
    setProductQuery('');
  }

  function updateQty(productId: string, qty: number) {
    const product = productMap.get(productId);
    const cap = Math.min(MAX_PER_LINE, product?.stockCount ?? 0);
    const clamped = Math.max(1, Math.min(cap, qty));
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty: clamped } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const submitDisabled = submitting || !customerId || lines.length === 0 || !pickupLocation.trim();

  async function handleSubmit() {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'admin',
          userId: customerId,
          items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
          orderStatus,
          paymentMethod: 'Credit Card',
          pickupLocation: pickupLocation.trim(),
          ...(pickupSlot.trim() && { pickupSlot: pickupSlot.trim() }),
          fulfillmentType: 'pickup' as const,
        }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'Failed to create order' }));
        toast.error(message ?? 'Failed to create order');
        return;
      }
      toast.success('Order created');
      onCreated();
    } catch {
      toast.error('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-line-soft">
        <div>
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted">New order</div>
          <div className="font-display text-[22px] tracking-[-0.01em]">Build an order</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Customer */}
        <section>
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-2">Customer</div>
          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 rounded-md border border-line bg-paper">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-camel/20 grid place-items-center font-display font-semibold text-[12px] text-ink">
                  {getInitials(selectedCustomer.name)}
                </div>
                <div>
                  <div className="font-medium text-[14px]">{selectedCustomer.name}</div>
                  <div className="text-[12px] text-muted">{selectedCustomer.email}</div>
                </div>
              </div>
              <button
                onClick={() => { setCustomerId(null); setCustomerQuery(''); }}
                className="text-[12px] text-ink-soft hover:text-oxblood"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-[14px] outline-none focus:border-ink"
              />
              <div className="mt-2 max-h-52 overflow-y-auto border border-line-soft rounded-md bg-paper">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3.5 py-4 text-[13px] text-muted text-center">No matches</div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCustomerId(c.id)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-left text-[13px] hover:bg-cream transition-colors border-b border-line-soft last:border-b-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted text-[12px]">{c.email}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* Items */}
        <section>
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-2">Items</div>

          {lines.length > 0 && (
            <div className="space-y-2 mb-3">
              {lines.map((line) => {
                const product = productMap.get(line.productId);
                if (!product) return null;
                const lineTotal = product.price * line.qty;
                return (
                  <div key={line.productId} className="flex items-center gap-3 p-2.5 rounded-md border border-line bg-paper">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[14px] truncate">{product.name}</div>
                      <div className="text-[12px] text-muted">
                        ${fmtPrice(product.price)} · {product.stockCount} in stock
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(line.productId, line.qty - 1)}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={line.qty}
                        min={1}
                        max={Math.min(MAX_PER_LINE, product.stockCount)}
                        onChange={(e) => updateQty(line.productId, parseInt(e.target.value, 10) || 1)}
                        className="w-12 text-center text-[13px] py-1 rounded-md border border-line bg-paper outline-none focus:border-ink"
                      />
                      <button
                        onClick={() => updateQty(line.productId, line.qty + 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:text-ink transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="font-display text-[14px] font-medium w-16 text-right">
                      ${fmtPrice(lineTotal)}
                    </div>
                    <button
                      onClick={() => removeLine(line.productId)}
                      aria-label="Remove item"
                      className="w-7 h-7 rounded-full text-muted grid place-items-center hover:text-oxblood transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search cuts to add…"
            className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-[14px] outline-none focus:border-ink"
          />
          <div className="mt-2 max-h-52 overflow-y-auto border border-line-soft rounded-md bg-paper">
            {filteredProducts.length === 0 ? (
              <div className="px-3.5 py-4 text-[13px] text-muted text-center">
                {lines.length === products.length ? 'Every active cut is in the order' : 'No matches'}
              </div>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p.id)}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-left text-[13px] hover:bg-cream transition-colors border-b border-line-soft last:border-b-0"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted">{p.category ?? ''} · {p.stockCount} in stock</div>
                  </div>
                  <div className="text-ink-soft">${fmtPrice(p.price)}</div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Pickup details */}
        <section className="space-y-3">
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted">Pickup details</div>
          <div>
            <label className="block text-[12px] text-ink-soft mb-1">Pickup location</label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-[14px] outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[12px] text-ink-soft mb-1">Pickup slot (optional)</label>
            <input
              type="text"
              value={pickupSlot}
              onChange={(e) => setPickupSlot(e.target.value)}
              placeholder="e.g. Sat 10am–12pm"
              className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-[14px] outline-none focus:border-ink"
            />
          </div>
        </section>

        {/* Initial status */}
        <section>
          <div className="text-[11px] font-medium tracking-[0.18em] uppercase text-muted mb-2">Initial status</div>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`block p-3 rounded-md border cursor-pointer transition-colors ${
                  orderStatus === opt.value ? 'border-ink bg-cream' : 'border-line bg-paper hover:border-ink-soft'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="admin-order-status"
                    value={opt.value}
                    checked={orderStatus === opt.value}
                    onChange={() => setOrderStatus(opt.value)}
                    className="w-3.5 h-3.5 cursor-pointer accent-oxblood"
                  />
                  <span className="font-medium text-[13px]">{opt.label}</span>
                </div>
                <div className="text-[12px] text-muted mt-1 ml-6">{opt.helper}</div>
              </label>
            ))}
          </div>
        </section>

        {/* Totals */}
        <section className="border-t border-line-soft pt-4 space-y-1.5 text-[13px]">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="font-mono">${fmtPrice(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Tax</span>
            <span className="font-mono">${fmtPrice(totals.tax)}</span>
          </div>
          <div className="flex justify-between font-display text-[16px] font-medium pt-1.5 border-t border-line-soft">
            <span>Total</span>
            <span>${fmtPrice(totals.total)}</span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line-soft bg-paper">
        <button
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 rounded-full bg-paper border border-line text-ink-soft text-[13px] hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitDisabled}
          className="px-4.5 py-2 rounded-full bg-ink text-cream text-[13px] font-medium hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating…' : 'Create order'}
        </button>
      </div>
    </div>
  );
}
