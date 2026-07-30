'use client';
import { useState } from 'react';
import {
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
  type OrderColumnVisibility,
} from '@/hooks/admin/useOrderColumns';

type Props = {
  visibleColumns: OrderColumnVisibility;
  onToggle: (key: OrderColumnKey) => void;
};

export default function OrdersColumnsPopover({ visibleColumns, onToggle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 bg-paper border rounded-full px-3.5 py-2 text-[13px] transition-colors ${
          open
            ? 'border-oxblood text-ink'
            : 'border-line text-ink-soft hover:border-ink hover:text-ink'
        }`}
      >
        Columns
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-52 bg-paper border border-line rounded-lg shadow-xl py-1.5">
            <div className="px-3.5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase text-muted">
              Show columns
            </div>
            {ORDER_COLUMN_OPTIONS.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2.5 px-3.5 py-1.5 text-[13px] text-ink-soft hover:bg-cream cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key]}
                  onChange={() => onToggle(col.key)}
                  className="w-3.5 h-3.5 rounded-sm border border-line bg-cream cursor-pointer accent-oxblood"
                />
                {col.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
