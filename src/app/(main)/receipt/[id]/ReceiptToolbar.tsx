'use client';

import ChevronIcon from '@/components/ui/icons/ChevronIcon';

type Props = {
  backHref: string;
  email: string;
  orderRef: string;
  orderId: string;
  shop: {
    shopName: string;
    phone: string;
    email: string;
    addressLine: string;
  };
  rewards?: {
    pointsRedeemed: number;
    pointsRedemptionDollars: number;
    pointsAwarded: number;
  };
};

export default function ReceiptToolbar({ backHref, email, orderRef, orderId, shop, rewards }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const orderUrl = `${origin}/checkout/confirmation?orderId=${orderId}`;

  const rewardsLines: string[] = [];
  if (rewards && rewards.pointsRedeemed > 0) {
    rewardsLines.push(
      `You redeemed ${rewards.pointsRedeemed.toLocaleString('en-US')} points and saved $${rewards.pointsRedemptionDollars.toFixed(2)} on this order.`,
    );
  }
  if (rewards && rewards.pointsAwarded > 0) {
    rewardsLines.push(
      `You'll earn ${rewards.pointsAwarded.toLocaleString('en-US')} points once we hand the order over.`,
    );
  }
  const rewardsBlock = rewardsLines.length > 0 ? `${rewardsLines.join('\n')}\n\n` : '';

  const body = encodeURIComponent(
    `Hi,\n\nYour order is confirmed and we're getting your cuts ready.\n\n` +
    `Order summary: ${orderUrl}\n` +
    `Reference: ${orderRef}\n\n` +
    rewardsBlock +
    `Pickup is at ${shop.addressLine}. We'll cut everything fresh before you arrive.\n\n` +
    `Questions before you come in? Call us at ${shop.phone} or reply here.\n\n` +
    `See you at the counter.\n` +
    `— ${shop.shopName}\n` +
    `${shop.addressLine}\n` +
    `${shop.phone} · ${shop.email}`,
  );
  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(`Your ${shop.shopName} order is confirmed — ${orderRef}`)}&body=${body}`;

  return (
    <div className="print:hidden w-full max-w-150 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
      <a
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft px-3.5 py-2 rounded-full bg-paper border border-line hover:border-ink hover:text-ink transition-colors self-start"
      >
        <ChevronIcon className="w-3 h-3 shrink-0" direction="left" />
        Back to orders
      </a>

      {/* Mobile: 2-col grid — Print | Download PDF on top, Email receipt full-width below */}
      {/* Desktop: flex row with all three inline */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium whitespace-nowrap hover:border-ink hover:text-ink transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-paper border border-line text-ink-soft text-[13px] font-medium whitespace-nowrap hover:border-ink hover:text-ink transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </button>
        <a
          href={mailtoHref}
          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-ink text-cream text-[13px] font-medium whitespace-nowrap hover:bg-oxblood transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Email receipt
        </a>
      </div>
    </div>
  );
}
