'use client';
import { getInitials, formatMoney, formatDate, relativeTime, avatarColorForId } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin/constants';
import { getTier, deriveTags, TIER_CONFIG } from './customerUtils';
import type { CustomerTableRow } from '@/types/admin';
import DemoPill from '@/components/demo/DemoPill';

type Props = {
  cust: CustomerTableRow;
  isSelected: boolean;
  onView: (cust: CustomerTableRow) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function CustomerTableRowComponent({
  cust,
  isSelected,
  onView,
  onToggleSelect,
  onDelete,
}: Props) {
  const tier        = getTier(cust.orderCount);
  const tierCfg     = TIER_CONFIG[tier];
  const avatarColor = avatarColorForId(cust.id, AVATAR_COLORS);
  const initials    = getInitials(cust.name);
  const tags        = deriveTags(cust);

  return (
    <tr
      onClick={() => onView(cust)}
      className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
        isSelected ? 'bg-camel/6' : 'hover:bg-cream'
      }`}
    >
      <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(cust.id)}
          className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
        />
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-3 min-w-52">
          <div className={`w-9 h-9 rounded-full grid place-items-center font-display font-semibold text-[12px] shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[14px] leading-snug">{cust.name}</span>
              {cust.isDemo && (
                <DemoPill title="Seeded demo account — protected from destructive admin actions." />
              )}
            </div>
            <div className="font-mono text-[11px] text-muted tracking-[0.02em]">{cust.email}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase whitespace-nowrap ${tierCfg.pillClass}`}>
          {tierCfg.showStar && (
            <svg className="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
            </svg>
          )}
          {tierCfg.label}
        </span>
      </td>

      <td className="px-4 py-4">
        <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
          {formatMoney(cust.totalSpend)}
          <span className="text-muted text-[11px] ml-1 font-normal font-sans">USD</span>
        </span>
      </td>

      <td className="px-4 py-4">
        <span className="font-mono text-[13px] font-medium">{cust.orderCount}</span>
      </td>

      <td className="px-4 py-4">
        {cust.lastOrderAt ? (
          <div className="text-[13px] leading-snug">
            <div className="font-medium text-ink">{formatDate(cust.lastOrderAt)}</div>
            <div className="font-mono text-[11px] text-muted mt-0.5">{relativeTime(cust.lastOrderAt)}</div>
          </div>
        ) : (
          <span className="text-[13px] text-muted">—</span>
        )}
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1 max-w-48">
          {tags.slice(0, 2).map((tag) => (
            <span key={tag.label} className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] tracking-[0.06em] uppercase whitespace-nowrap ${tag.cls}`}>
              {tag.label}
            </span>
          ))}
        </div>
      </td>

      <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity">
          <button onClick={() => onView(cust)} aria-label="View customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button onClick={() => window.open(`mailto:${cust.email}`)} aria-label="Email customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          </button>
          <button
            onClick={() => { if (!cust.isDemo) onDelete(cust.id); }}
            disabled={cust.isDemo}
            aria-disabled={cust.isDemo}
            aria-label="Delete customer"
            title={cust.isDemo ? 'Demo accounts cannot be deleted' : undefined}
            className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-oxblood hover:bg-red-soft hover:text-oxblood transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink-soft"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
