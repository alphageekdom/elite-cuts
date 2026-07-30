'use client';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { TAX_RATE } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';
import { fmtPrice } from '@/lib/pricing';
import { getInitials } from '@/lib/format';
import { DrawerHeader, DrawerBody, DrawerFooter } from '@/components/admin/DrawerChrome';
import { labelCls } from '@/components/admin/AdminForm';

export type AdminOrderCustomer = {
  id: string;
  name: string;
  email: string;
};

export type AdminOrderProduct = {
  id: string;
  name: string;
  // Per-unit estimate, matching what the order will snapshot — for a weighed
  // cut that's the typical-weight estimate, not the per-pound rate.
  price: number;
  // Customer-facing price label ("$24.99/lb") when the cut has one, so a
  // weighed line shows the rate its estimate was derived from.
  priceLabel?: string;
  // True only for cuts priced by weight, where `price` is a best guess rather
  // than the amount charged. Gates the "est. … ea" suffix — on a fixed-price
  // cut the label and the estimate are the same number, and printing both
  // reads as "$8.99 · est. $8.99 ea".
  isEstimatedPrice?: boolean;
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

  const missingHint = submitting
    ? null
    : !customerId
      ? 'Select a customer'
      : lines.length === 0
        ? 'Add at least one item'
        : !pickupLocation.trim()
          ? 'Set a pickup location'
          : null;

  async function handleSubmit() {
    if (submitDisabled) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      <DrawerHeader
        eyebrow="New order"
        title="Build an order"
        titleId="order-create-title"
        onClose={onClose}
      />

      <DrawerBody>
        {/* Customer */}
        <section>
          <div className={labelCls}>Customer</div>
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
                aria-label="Search customers"
              />
              <div className="mt-2 max-h-52 overflow-y-auto border border-line-soft rounded-md bg-paper">
                {filteredCustomers.length === 0 ? (
                  <div className="px-3.5 py-4 text-[13px] text-muted text-center">No matches</div>
                ) : (
                  <>
                    {!customerQuery.trim() && (
                      <div className={`px-3.5 pt-2 pb-1 ${labelCls}`}>
                        Suggested
                      </div>
                    )}
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCustomerId(c.id)}
                        className="group w-full flex items-center gap-3 px-3.5 py-2 text-left text-[13px] hover:bg-cream transition-colors border-b border-line-soft last:border-b-0"
                      >
                        <span className="font-medium flex-1 min-w-0 truncate">{c.name}</span>
                        <span className="text-muted text-[12px] min-w-0 truncate">{c.email}</span>
                        <svg
                          aria-hidden="true"
                          className="w-3.5 h-3.5 text-muted shrink-0 group-hover:text-oxblood transition-colors"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* Items */}
        <section>
          <div className={labelCls}>Items</div>

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
                        {product.priceLabel && product.isEstimatedPrice
                          ? `${product.priceLabel} · est. $${fmtPrice(product.price)} ea`
                          : product.priceLabel || `$${fmtPrice(product.price)}`}{' '}
                        · {product.stockCount} in stock
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
            aria-label="Search cuts to add"
          />
          <div className="mt-2 max-h-52 overflow-y-auto border border-line-soft rounded-md bg-paper">
            {filteredProducts.length === 0 ? (
              <div className="px-3.5 py-4 text-[13px] text-muted text-center">
                {lines.length === products.length ? 'Every active cut is in the order' : 'No matches'}
              </div>
            ) : (
              <>
                {!productQuery.trim() && (
                  <div className={`px-3.5 pt-2 pb-1 ${labelCls}`}>
                    Suggested
                  </div>
                )}
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p.id)}
                    className="group w-full flex items-center justify-between px-3.5 py-2 text-left text-[13px] hover:bg-cream transition-colors border-b border-line-soft last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-muted">{p.category ?? ''} · {p.stockCount} in stock</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-ink-soft">
                        {p.priceLabel || `$${fmtPrice(p.price)}`}
                      </span>
                      <span
                        aria-hidden="true"
                        className="w-6 h-6 rounded-full border border-line text-muted grid place-items-center group-hover:border-oxblood group-hover:text-oxblood transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </section>

        {/* Pickup details */}
        <section className="space-y-3">
          <div className={labelCls}>Pickup details</div>
          <div>
            <label htmlFor="order-pickup-location" className="block text-[12px] text-ink-soft mb-1">Pickup location</label>
            <input
              id="order-pickup-location"
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-line bg-paper text-[14px] outline-none focus:border-ink"
            />
          </div>
          <div>
            <label htmlFor="order-pickup-slot" className="block text-[12px] text-ink-soft mb-1">Pickup slot (optional)</label>
            <input
              id="order-pickup-slot"
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
          <div className={labelCls}>Initial status</div>
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

        {lines.length > 0 && (
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
        )}
      </DrawerBody>

      <DrawerFooter
        blocker={missingHint}
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitLabel="Create order"
        busyLabel="Creating…"
        busy={submitting}
        disabled={submitDisabled}
      />
    </div>
  );
}
