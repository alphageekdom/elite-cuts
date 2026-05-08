import { GiMeatCleaver } from 'react-icons/gi';

const MONTH = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmtDate(d: Date) {
  return `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

type Props = {
  orderRef: string;
  orderStatus: string;
  pillCls: string;
  createdAt: Date;
  pickedUp: boolean;
};

export default function ReceiptHeader({ orderRef, orderStatus, pillCls, createdAt, pickedUp }: Props) {
  return (
    <div className="px-10 sm:px-12 py-10 text-center border-b border-line-soft">
      {/* Brand */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-full bg-oxblood text-cream grid place-items-center shrink-0">
          <GiMeatCleaver className="text-xl" aria-hidden="true" />
        </span>
        <span className="font-display text-[26px] font-semibold tracking-tight leading-none">
          Elite<em className="italic text-oxblood font-normal">Cuts</em>
        </span>
      </div>
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted mb-7">
        3045 30th St · North Park, San Diego, CA 92104
      </div>

      {/* Order ref */}
      <div className="font-display text-[42px] sm:text-[52px] font-normal tracking-tight leading-none mb-4">
        {orderRef.slice(0, 3)}<em className="italic text-oxblood font-normal">{orderRef.slice(3)}</em>
      </div>

      {/* Status pill */}
      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase mb-5 ${pillCls}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {orderStatus}
      </span>

      {/* Status notes */}
      {orderStatus === 'Order Placed' && (
        <p className="font-mono text-[11px] text-muted tracking-[0.04em] mb-4 -mt-1">
          Order received — we&apos;ll notify you when it&apos;s ready.
        </p>
      )}
      {orderStatus === 'Preparing' && (
        <p className="font-mono text-[11px] text-muted tracking-[0.04em] mb-4 -mt-1">
          Your cuts are being prepared — we&apos;ll notify you when they&apos;re ready.
        </p>
      )}

      {/* Date row */}
      <div className="flex items-center justify-center gap-4 font-mono text-[11px] text-muted tracking-[0.04em] flex-wrap">
        <span>{fmtDate(createdAt)}</span>
        {pickedUp && (
          <>
            <span className="text-line">|</span>
            <span>Picked up</span>
          </>
        )}
      </div>
    </div>
  );
}
