'use client';
import { useState } from 'react';
import NewMessageModal from './NewMessageModal';

type Props = {
  orderId: string;
  orderRef: string;
};

export default function OrderHelpButton({ orderId, orderRef }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-muted hover:text-oxblood border border-line hover:border-oxblood/40 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
      >
        Get help
      </button>

      <NewMessageModal
        isOpen={open}
        onClose={() => setOpen(false)}
        prefilledSubject={`Order #EC-${orderRef} — I need help with this order`}
        prefilledOrderId={orderId}
        prefilledOrderRef={`EC-${orderRef}`}
      />
    </>
  );
}
