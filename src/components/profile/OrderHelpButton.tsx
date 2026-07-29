'use client';
import { useState } from 'react';
import { orderRef as formatOrderRef, orderRefBare } from '@/lib/orders/reference';
import NewMessageModal from './NewMessageModal';

// Takes the raw order id and derives both reference forms itself. It used to
// take a pre-sliced `orderRef` and prepend `EC-` to it — so when the caller
// started passing the already-prefixed `orderRefBare()`, every help message
// went out reading "Order #EC-EC-5D61". Deriving here removes the seam that
// allowed the two halves to disagree.
type Props = {
  orderId: string;
};

export default function OrderHelpButton({ orderId }: Props) {
  const [open, setOpen] = useState(false);
  const displayRef = formatOrderRef(orderId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Every row renders this button, so an unqualified "Get help" gives a
        // screen-reader user six identical controls with no way to tell which
        // order each belongs to.
        aria-label={`Get help with order ${displayRef}`}
        className="text-[12px] font-medium text-muted hover:text-oxblood border border-line hover:border-oxblood/40 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
      >
        Get help
      </button>

      <NewMessageModal
        isOpen={open}
        onClose={() => setOpen(false)}
        prefilledSubject={`Order ${displayRef} — I need help with this order`}
        prefilledOrderId={orderId}
        prefilledOrderRef={orderRefBare(orderId)}
      />
    </>
  );
}
