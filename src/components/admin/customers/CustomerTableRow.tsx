'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getInitials, formatMoney, formatDate, relativeTime, avatarColorForId } from '@/lib/format';
import { AVATAR_COLORS } from '@/lib/admin-constants';
import { computeFloatingMenuPos } from '@/lib/floatingMenu';
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

const MENU_WIDTH = 160; // matches Tailwind w-40 (10rem at default 16px)

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

  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const isOpen = openMenuId === cust.id;

  // The row actions menu has to escape two overflow containers (the table
  // wrap's `overflow-hidden` and the inner `overflow-x-auto` that lets the
  // table scroll horizontally on narrow viewports), so we portal it to body
  // and pin it to the More button via getBoundingClientRect. Reposition on
  // scroll/resize so the menu stays attached while the table scrolls.
  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }
    function update() {
      const btn = moreBtnRef.current;
      if (!btn) return;
      // Estimated height: 3 items × ~44px + 1 divider ≈ 140px. The shared
      // helper flips the menu above the trigger when there's not enough
      // room below, so a tight viewport doesn't clip it off-screen.
      setMenuPos(
        computeFloatingMenuPos(btn.getBoundingClientRect(), {
          menuWidth: MENU_WIDTH,
          estimatedMenuHeight: 150,
        }),
      );
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen]);

  // Esc to dismiss.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onMenuToggle(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onMenuToggle]);

  return (
    <tr
      onClick={() => onView(cust)}
      className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
        isSelected ? 'bg-camel/6' : 'hover:bg-cream'
      } ${isOpen ? 'ring-1 ring-inset ring-ink' : ''}`}
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
        <div className={`inline-flex gap-1 transition-opacity ${isOpen ? '' : 'opacity-40 group-hover:opacity-100'}`}>
          <button onClick={() => onView(cust)} aria-label="View customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          </button>
          <button onClick={() => window.open(`mailto:${cust.email}`)} aria-label="Email customer" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          </button>
          <button
            ref={moreBtnRef}
            onClick={() => onMenuToggle(isOpen ? null : cust.id)}
            aria-label="More"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>
          </button>
        </div>
        {isOpen && menuPos && createPortal(
          <div
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25"
            onClick={(e) => e.stopPropagation()}
          >
            <button role="menuitem" onClick={() => { onView(cust); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View profile
            </button>
            <button role="menuitem" onClick={() => { window.open(`mailto:${cust.email}`); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </button>
            <div className="border-t border-cream/25" />
            <button role="menuitem" onClick={() => { onDelete(cust.id); onMenuToggle(null); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-red-400 hover:bg-cream/10 transition-colors">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete
            </button>
          </div>,
          document.body,
        )}
      </td>
    </tr>
  );
}
