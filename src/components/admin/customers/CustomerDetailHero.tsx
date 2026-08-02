'use client';
import { formatDate, formatMoney, getInitials } from '@/lib/format';
import { getLifecycle } from '@/lib/admin/customer-tier';
import AdminEyebrow from '@/components/admin/AdminEyebrow';
import type { CustomerTableRow } from '@/types/admin';
import { ACTIVITY_CONFIG, TIER_CONFIG_DARK, getActivity, getTier } from './customerUtils';

type Props = {
  customer: CustomerTableRow;
  onClose: () => void;
};

export default function CustomerDetailHero({ customer, onClose }: Props) {
  const tier = getTier(customer.orderCount);
  const tierCfg = TIER_CONFIG_DARK[tier];
  const activity = getActivity(customer);
  const actCfg = ACTIVITY_CONFIG[activity];
  const initials = getInitials(customer.name);
  const custId = `CUST-${customer.id.slice(-5).toUpperCase()}`;
  const avgOrder = customer.orderCount > 0 ? customer.totalSpend / customer.orderCount : 0;

  const { isSoftDeleted, isDormancyWarned } = getLifecycle(customer);

  const scheduledForLabel = (() => {
    if (!customer.deletionScheduledFor) return '';
    const d = new Date(customer.deletionScheduledFor);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  // Format both the warning date and the scheduled cleanup date (warning + 30d)
  // so the pill can show "sent on X, cleanup on Y".
  const dormancyLabels = (() => {
    if (!customer.dormancyWarnedAt) return { warned: '', cleanup: '' };
    const warned = new Date(customer.dormancyWarnedAt);
    if (Number.isNaN(warned.getTime())) return { warned: '', cleanup: '' };
    const cleanup = new Date(warned.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return { warned: fmt(warned), cleanup: fmt(cleanup) };
  })();

  return (
    <div className="relative bg-ink text-cream px-6 py-6 sm:px-8 sm:py-8 shrink-0 overflow-hidden">
      <div className="absolute -top-30 -right-30 w-64 h-64 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(184,137,90,0.18)_0%,transparent_60%)]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0 flex-1">
            <AdminEyebrow size="drawer" className="mb-1">Customer profile</AdminEyebrow>
            <div className="font-mono text-[11px] text-cream/60 tracking-[0.04em] truncate">
              {custId} · MEMBER SINCE {formatDate(customer.createdAt).toUpperCase()}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close customer profile"
            className="w-9 h-9 rounded-full border border-cream/15 bg-cream/8 text-cream grid place-items-center hover:border-cream/30 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-camel text-ink grid place-items-center font-display font-semibold text-[20px] sm:text-[22px] shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div id="customer-detail-title" className="font-display text-[22px] sm:text-[26px] font-medium tracking-tight leading-tight mb-1 wrap-break-word">
              {customer.name}
            </div>
            <div className="font-mono text-[12px] text-cream/65 tracking-[0.04em] mb-2.5 wrap-break-word">
              {customer.email.toUpperCase()}
              {customer.phone && (
                <>
                  {' · '}
                  <span className="whitespace-nowrap">{customer.phone}</span>
                </>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isSoftDeleted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-oxblood/25 text-cream border border-oxblood/40">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {scheduledForLabel
                    ? `Scheduled for deletion on ${scheduledForLabel}`
                    : 'Scheduled for deletion'}
                </span>
              )}
              {isDormancyWarned && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-camel/25 text-cream border border-camel/40">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {dormancyLabels.warned && dormancyLabels.cleanup
                    ? `Dormancy warning sent ${dormancyLabels.warned} · cleanup on ${dormancyLabels.cleanup}`
                    : 'Dormancy warning sent'}
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase ${tierCfg.pillClass}`}>
                {tierCfg.showStar && (
                  <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
                  </svg>
                )}
                {tierCfg.label}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] ${actCfg.pillClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {actCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 pt-5 border-t border-cream/12">
          <div className="pr-4 border-r border-cream/8">
            <div className="text-[10px] tracking-[0.18em] uppercase text-cream/60 mb-2">Lifetime spend</div>
            <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
              {formatMoney(customer.totalSpend)}
            </div>
            <div className="font-mono text-[11px] text-cream/60 tracking-[0.04em]">
              {customer.orderCount} ORDER{customer.orderCount !== 1 ? 'S' : ''}
            </div>
          </div>
          <div className="px-4 border-r border-cream/8">
            <div className="text-[10px] tracking-[0.18em] uppercase text-cream/60 mb-2">Avg order</div>
            <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
              {avgOrder > 0 ? formatMoney(avgOrder) : '—'}
            </div>
            <div className="font-mono text-[11px] text-cream/60 tracking-[0.04em]">PER ORDER</div>
          </div>
          <div className="pl-4">
            <div className="text-[10px] tracking-[0.18em] uppercase text-cream/60 mb-2">Saved cuts</div>
            <div className="font-display text-[20px] font-normal leading-none tracking-tight mb-0.5">
              {customer.savedCutsCount}
            </div>
            <div className="font-mono text-[11px] text-cream/60 tracking-[0.04em]">FAVOURITES</div>
          </div>
        </div>
      </div>
    </div>
  );
}
