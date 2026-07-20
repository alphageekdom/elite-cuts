'use client';
import { productImageSrc, formatMoney } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/admin/constants';
import { STOCK_UNIT, UNIT_SUFFIX } from '@/lib/products/price-bands';
import AdminRowActionsMenu, { type RowActionsMenuItem } from '@/components/admin/AdminRowActionsMenu';
import type { ProductTableRow } from '@/types/admin';

const ICON_DUPLICATE = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);
const ICON_ARCHIVE = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);
const ICON_DELETE = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

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

  // Pricing-type-driven unit labels. Legacy rows without a pricingType fall
  // back to no suffix on the price and a bare "in stock" count.
  const priceSuffix = product.pricingType ? UNIT_SUFFIX[product.pricingType] : '';
  const stockUnit = product.pricingType ? STOCK_UNIT[product.pricingType] : '';

  const isMenuOpen = openMenuId === product.id;

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
        {priceSuffix && (
          <span className="text-[11px] text-muted italic font-normal ml-0.5">{priceSuffix}</span>
        )}
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
            {product.stockCount}{stockUnit && ` ${stockUnit}`}
          </span>
        </div>
      </td>

      {/* Tags */}
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1 max-w-40">
          {product.isAged && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-red-soft text-oxblood">AGED</span>
          )}
          {product.isFeatured && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-mono tracking-[0.06em] uppercase bg-camel/18 text-camel-deep">FEATURED</span>
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
            <AdminRowActionsMenu
              ariaLabel={`Actions for ${product.name}`}
              open={isMenuOpen}
              onOpenChange={(next) => onMenuToggle(next ? product.id : null)}
              items={[
                { label: 'Duplicate', icon: ICON_DUPLICATE, onSelect: () => onDuplicate(product) },
                { label: 'Archive', icon: ICON_ARCHIVE, onSelect: () => onArchive(product.id) },
                { label: 'Delete', icon: ICON_DELETE, destructive: true, divider: true, onSelect: () => onDelete(product.id) },
              ] satisfies RowActionsMenuItem[]}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}
