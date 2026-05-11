'use client';
import { getInitials, formatMoney, formatDate, relativeTime } from '@/lib/admin-utils';
import { avatarColorForId } from '@/lib/admin-utils';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import { getTier, getActivity, deriveTags, TIER_CONFIG, ACTIVITY_CONFIG } from './customerUtils';
import type { CustomerTableRow } from '@/types/admin';

type Props = {
  cust: CustomerTableRow;
  isSelected: boolean;
  openMenuId: string | null;
  onView: (cust: CustomerTableRow) => void;
  onToggleSelect: (id: string) => void;
  onMenuToggle: (id: string | null) => void;
  onDelete: (id: string) => void;
};

export default function CustomerTableRowComponent({
  cust,
  isSelected,
  openMenuId,
  onView,
  onToggleSelect,
  onMenuToggle,
  onDelete,
}: Props) {
  const tier        = getTier(cust.orderCount);
  const activity    = getActivity(cust);
  const tierCfg     = TIER_CONFIG[tier];
  const actCfg      = ACTIVITY_CONFIG[activity];
  const avatarColor = avatarColorForId(cust.id, AVATAR_COLORS);
  const initials    = getInitials(cust.name);
  const avgOrder    = cust.orderCount > 0 ? cust.totalSpend / cust.orderCount : 0;
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
            <div className="font-medium text-[14px] leading-snug">{cust.name}</div>
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
        <span className="font-mono text-[13px] text-ink-soft">
          {avgOrder > 0 ? formatMoney(avgOrder) : '—'}
        </span>
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${actCfg.pillClass}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {actCfg.label}
        </span>
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
        <div className="relative inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(cust)} aria-label="View customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button onClick={() => window.open(`mailto:${cust.email}`)} aria-label="Email customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          </button>
          <button onClick={() => onMenuToggle(openMenuId === cust.id ? null : cust.id)} aria-label="More" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>
          </button>
          {openMenuId === cust.id && (
            <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25">
              <button onClick={() => { onView(cust); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View profile
              </button>
              <button onClick={() => { window.open(`mailto:${cust.email}`); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Email
              </button>
              <div className="border-t border-cream/25" />
              <button onClick={() => { onDelete(cust.id); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-red-400 hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
