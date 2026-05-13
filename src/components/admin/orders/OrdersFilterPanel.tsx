'use client';

// Filter values for the More filters popover. The payment values mirror the
// model's PAYMENT_STATUSES strings so comparisons against `order.paymentStatus`
// are direct. Date range and status are handled separately (RangeToggle and the
// stat strip respectively), so this panel just covers the dimensions those two
// don't.
export type PaymentFilter = 'any' | 'Completed' | 'Pending' | 'Refunded' | 'Partially Refunded';
export type FulfillmentFilter = 'any' | 'pickup' | 'delivery';

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'any',                  label: 'Any state' },
  { value: 'Completed',            label: 'Paid' },
  { value: 'Pending',              label: 'Pending' },
  { value: 'Refunded',             label: 'Refunded' },
  { value: 'Partially Refunded',   label: 'Partially refunded' },
];

const FULFILLMENT_OPTIONS: { value: FulfillmentFilter; label: string }[] = [
  { value: 'any',      label: 'Any type' },
  { value: 'pickup',   label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
];

type Props = {
  payment: PaymentFilter;
  fulfillment: FulfillmentFilter;
  onPaymentChange: (v: PaymentFilter) => void;
  onFulfillmentChange: (v: FulfillmentFilter) => void;
  onClear: () => void;
  onClose: () => void;
};

export default function OrdersFilterPanel({
  payment,
  fulfillment,
  onPaymentChange,
  onFulfillmentChange,
  onClear,
  onClose,
}: Props) {
  const hasActive = payment !== 'any' || fulfillment !== 'any';

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-full mt-2 z-20 w-64 bg-paper border border-line rounded-lg shadow-xl py-3">
        <div className="px-3.5 pb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-[0.16em] uppercase text-muted">More filters</span>
          {hasActive && (
            <button
              onClick={onClear}
              className="text-[11px] font-medium tracking-[0.04em] text-oxblood hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="px-3.5 pt-2">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">Payment</div>
          {PAYMENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 py-1 text-[13px] text-ink-soft cursor-pointer">
              <input
                type="radio"
                name="orders-payment-filter"
                value={opt.value}
                checked={payment === opt.value}
                onChange={() => onPaymentChange(opt.value)}
                className="w-3.5 h-3.5 cursor-pointer accent-oxblood"
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="px-3.5 pt-3">
          <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-ink-soft mb-1.5">Fulfillment</div>
          {FULFILLMENT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2.5 py-1 text-[13px] text-ink-soft cursor-pointer">
              <input
                type="radio"
                name="orders-fulfillment-filter"
                value={opt.value}
                checked={fulfillment === opt.value}
                onChange={() => onFulfillmentChange(opt.value)}
                className="w-3.5 h-3.5 cursor-pointer accent-oxblood"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
