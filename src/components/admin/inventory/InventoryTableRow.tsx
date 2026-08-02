'use client';
import Image from 'next/image';
import { productImageSrc } from '@/lib/format';
import { CATEGORY_COLORS } from '@/lib/admin/constants';
import { CATEGORY_PAR, DEFAULT_PAR, getStockState, type StockState, type InventoryRow } from '@/lib/inventory';

const STOCK_BAR_COLOR: Record<StockState, string> = {
  healthy: 'bg-green',
  low:     'bg-amber',
  critical:'bg-oxblood',
  out:     'bg-muted',
  over:    'bg-camel',
};

type Props = {
  row: InventoryRow;
  stockEditId: string | null;
  stockEditValue: string;
  stockSaving: boolean;
  onStockEdit: (id: string, currentValue: string) => void;
  onStockValueChange: (v: string) => void;
  onStockSave: (id: string) => void;
  onStockCancel: () => void;
  onReorder: (row: InventoryRow) => void;
};

export default function InventoryTableRowComponent({
  row,
  stockEditId,
  stockEditValue,
  stockSaving,
  onStockEdit,
  onStockValueChange,
  onStockSave,
  onStockCancel,
  onReorder,
}: Props) {
  const par      = CATEGORY_PAR[row.category] ?? DEFAULT_PAR;
  const state    = getStockState(row.stockCount, par);
  const barWidth = Math.min((row.stockCount / par) * 100, 100);
  const thumb    = productImageSrc(row.images[0]);

  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream transition-colors cursor-pointer group">
      {/* Product */}
      <td className="pl-6 pr-4 py-3.5 min-w-60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded bg-cream-deep shrink-0 overflow-hidden">
            {thumb ? (
              // 44px box (w-11). Fixed width/height rather than `fill` so the row
              // needs no positioning context; next/image handles the 2x srcset.
              <Image
                src={thumb}
                alt={row.name}
                width={44}
                height={44}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
          <div>
            <div className="font-display text-[15px] font-medium tracking-tight leading-snug mb-0.5">{row.name}</div>
            <div className="font-mono text-[11px] text-muted tracking-[0.04em]">
              {row.category.toUpperCase()}{row.isAged ? ' · AGED' : ''}
            </div>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3.5">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-[0.12em] uppercase ${CATEGORY_COLORS[row.category] ?? 'bg-cream-deep text-muted-deep'}`}>
          {row.category}
        </span>
      </td>

      {/* Stock bar */}
      <td className="px-4 py-3.5 min-w-40">
        <div className="w-full max-w-40">
          <div className="flex justify-between mb-1 font-mono text-[11px] tracking-[0.02em]">
            <span className="text-ink font-medium">{row.stockCount} units</span>
            <span className="text-muted">/ {par} par</span>
          </div>
          <div className="h-1.5 bg-cream-deep rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${STOCK_BAR_COLOR[state]}`} style={{ width: `${barWidth}%` }} />
          </div>
        </div>
      </td>


      {/* Supplier */}
      <td className="px-4 py-3.5">
        {row.supplier ? (
          <div className="text-[13px] font-medium text-ink leading-snug">{row.supplier}</div>
        ) : (
          <span className="text-muted text-[13px]">—</span>
        )}
      </td>

      {/* Delivery status */}
      <td className="px-4 py-3.5">
        {row.deliveryStatus ? (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[0.04em] whitespace-nowrap ${
            row.deliveryStatus === 'confirmed' ? 'bg-green-soft text-green-deep' :
            row.deliveryStatus === 'pending'   ? 'bg-amber-soft text-amber-deep' :
            'bg-ink/6 text-muted-deep'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {row.deliveryStatus === 'received' ? 'Received' : row.deliveryStatus.charAt(0).toUpperCase() + row.deliveryStatus.slice(1)}
          </span>
        ) : (
          <span className="text-[12px] text-muted">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="pr-6 pl-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        {stockEditId === row.id ? (
          <div className="inline-flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={stockEditValue}
              onChange={(e) => onStockValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onStockSave(row.id);
                if (e.key === 'Escape') onStockCancel();
              }}
              autoFocus
              className="w-16 border border-ink rounded-lg px-2 py-1 text-[13px] text-ink bg-paper outline-none text-center"
            />
            <button onClick={() => onStockSave(row.id)} disabled={stockSaving} aria-label={`Save stock count for ${row.name}`} className="w-7 h-7 rounded-full bg-ink text-cream grid place-items-center hover:bg-oxblood transition-colors disabled:opacity-50">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
            <button onClick={onStockCancel} aria-label="Cancel stock edit" className="w-7 h-7 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink transition-colors">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        ) : (
          <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 pointer-coarse:opacity-100 transition-opacity">
            <button
              onClick={() => onStockEdit(row.id, String(row.stockCount))}
              className="w-7 h-7 rounded-full bg-transparent border border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink transition-colors grid place-items-center"
              aria-label="Adjust stock"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => onReorder(row)}
              className="w-7 h-7 rounded-full bg-transparent border border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink transition-colors grid place-items-center"
              aria-label="Order more"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
