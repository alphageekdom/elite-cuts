'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { productImageSrc, formatMoney } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/admin-constants';
import { computeFloatingMenuPos, type FloatingMenuPos } from '@/lib/floatingMenu';
import type { ProductTableRow } from '@/types/admin';

// Matches w-44 (11rem at 16px). The portal-positioned menu pins to the More
// button right-aligned, matching the row-relative version it replaced.
const MENU_WIDTH = 176;

const STOCK_FILL: Record<string, string> = {
  healthy: 'var(--color-green)',
  low:     'var(--color-amber, #A87B2B)',
  critical:'var(--color-oxblood)',
  out:     'var(--color-muted)',
  over:    'var(--color-camel)',
};

function stockState(count: number): 'healthy' | 'low' | 'critical' | 'out' {
  if (count === 0) return 'out';
  if (count < 5)  return 'critical';
  if (count < 15) return 'low';
  return 'healthy';
}

function stockFillWidth(count: number): number {
  if (count === 0) return 0;
  return Math.min(100, (count / 30) * 100);
}

type Props = {
  product: ProductTableRow;
  isSelected: boolean;
  openMenuId: string | null;
  onEdit: (product: ProductTableRow) => void;
  onToggleSelect: (id: string) => void;
  onMenuToggle: (id: string | null) => void;
  onDuplicate: (product: ProductTableRow) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function ProductTableRowComponent({
  product,
  isSelected,
  openMenuId,
  onEdit,
  onToggleSelect,
  onMenuToggle,
  onDuplicate,
  onArchive,
  onDelete,
}: Props) {
  const state    = stockState(product.stockCount);
  const fillPct  = stockFillWidth(product.stockCount);
  const catClass = CATEGORY_COLORS[product.category] ?? 'bg-cream-deep text-ink-soft';
  const thumb    = productImageSrc(product.images[0]);

  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<FloatingMenuPos | null>(null);
  const isMenuOpen = openMenuId === product.id;

  // The products table sits inside an `overflow-x-auto` wrapper that also
  // has `overflow-hidden` ancestors, so a normally positioned absolute
  // dropdown gets clipped on the last row. Portal the menu to body and
  // pin it via the shared floating-menu helper, which also flips above
  // the trigger when the viewport is too short to fit the menu below.
  useLayoutEffect(() => {
    // No early-clear of menuPos: the portaled dropdown is also gated on
    // `isMenuOpen` below, so a stale position when closed never reaches the
    // DOM, and the next open overwrites menuPos via `update()`.
    if (!isMenuOpen) return;
    const update = () => {
      const btn = moreBtnRef.current;
      if (!btn) return;
      // 3 items × ~44px + 1 divider ≈ 145px.
      setMenuPos(
        computeFloatingMenuPos(btn.getBoundingClientRect(), {
          menuWidth: MENU_WIDTH,
          estimatedMenuHeight: 150,
        }),
      );
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isMenuOpen]);

  return (
    <tr
      key={product.id}
      onClick={() => onEdit(product)}
      className={`group border-b border-line-soft last:border-b-0 cursor-pointer transition-colors ${
        isSelected ? 'bg-camel/6' : 'hover:bg-cream'
      } ${isMenuOpen ? 'ring-1 ring-inset ring-ink' : ''}`}
    >
      {/* Checkbox */}
      <td className="pl-6 pr-0 py-4" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          className="w-4 h-4 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
        />
      </td>

      {/* Product */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3.5 min-w-60">
          <div className="w-14 h-14 rounded-md bg-cream-deep shrink-0 overflow-hidden">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted">
                <svg className="w-5 h-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-medium tracking-[-0.005em] leading-snug mb-0.5 truncate">
              {product.name}
            </div>
            <div className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
              {product.category} · ★ {product.rating.toFixed(1)}
            </div>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-4">
        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase ${catClass}`}>
          {product.category}
        </span>
      </td>

      {/* Price */}
      <td className="px-4 py-4">
        <span className="font-display text-[16px] font-medium tracking-[-0.01em]">
          {formatMoney(product.price)}
        </span>
        <span className="text-[11px] text-muted italic font-normal ml-0.5">/lb</span>
      </td>

      {/* Stock */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-15 h-1.5 bg-cream-deep rounded-full overflow-hidden shrink-0">
            <div
              className="h-full rounded-full"
              style={{ width: `${fillPct}%`, background: STOCK_FILL[state] }}
            />
          </div>
          <span className="font-mono text-[12px] text-ink font-medium min-w-9">
            {product.stockCount} lb
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        {product.stockCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-green-soft text-green">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            In Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] bg-red-soft text-oxblood">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Out of Stock
          </span>
        )}
      </td>

      {/* Tags */}
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1 max-w-40">
          {product.isAged && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-red-soft text-oxblood">AGED</span>
          )}
          {product.isFeatured && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-[rgba(184,137,90,0.18)] text-camel">FEATURED</span>
          )}
          {product.isNewArrival && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-ink text-cream">NEW</span>
          )}
          {!product.isAged && !product.isFeatured && !product.isNewArrival && (
            <span className="text-[11px] text-muted">—</span>
          )}
        </div>
      </td>

      {/* Row actions */}
      <td className="pr-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1">
          <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(product)}
              aria-label="Edit product"
              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              ref={moreBtnRef}
              onClick={() => onMenuToggle(isMenuOpen ? null : product.id)}
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-cream hover:text-ink transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" />
              </svg>
            </button>
          </div>
          {isMenuOpen && menuPos && createPortal(
            <div
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
              className="fixed z-50 rounded-lg shadow-xl overflow-hidden bg-ink border border-cream/25"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => onDuplicate(product)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Duplicate
              </button>
              <button onClick={() => onArchive(product.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-cream hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                </svg>
                Archive
              </button>
              <div className="border-t border-cream/25" />
              <button onClick={() => onDelete(product.id)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-left text-red-400 hover:bg-cream/10 transition-colors">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Delete
              </button>
            </div>,
            document.body,
          )}
        </div>
      </td>
    </tr>
  );
}
