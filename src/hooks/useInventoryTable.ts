'use client';
import { useState } from 'react';
import { toast } from 'sonner';

import { CATEGORY_PAR, DEFAULT_PAR, getStockState, type InventoryRow } from '@/lib/inventory';

// Owns the inventory list state, the per-tab visibility snapshot that keeps
// rows from vanishing mid-session when their stock crosses a threshold, the
// inline stock-edit state machine + PATCH, and the row-level reorder drawer.
// InventoryClient.tsx keeps purely visual state (search, sort, page, category
// filter, alert dismissal, export-in-flight) and renders what this hook returns.

export function useInventoryTable(initialRows: InventoryRow[]) {
  const [rows, setRows] = useState(initialRows);
  const [lastRows, setLastRows] = useState(initialRows);
  // Adjust-during-render keeps the local list in sync with whichever rows the
  // server just sent down (a router.refresh after a delivery or stocktake
  // commit, for example) without an effect.
  if (lastRows !== initialRows) {
    setLastRows(initialRows);
    setRows(initialRows);
  }

  // Tab snapshot — the set of row IDs the current stat-strip tab considers
  // qualifying, captured at click time so a row stays visible after a stock
  // edit moves it out of the tab's range.
  const [tabSnapshot, setTabSnapshot] = useState<Set<string>>(
    () => new Set(initialRows.map((r) => r.id)),
  );

  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockEditValue, setStockEditValue] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [reorderRow, setReorderRow] = useState<InventoryRow | null>(null);

  function beginEdit(id: string, currentValue: string) {
    setStockEditId(id);
    setStockEditValue(currentValue);
  }

  function cancelEdit() {
    setStockEditId(null);
  }

  async function saveStock(id: string) {
    const newCount = parseInt(stockEditValue, 10);
    if (isNaN(newCount) || newCount < 0) {
      toast.error('Stock must be a non-negative number');
      return;
    }
    setStockSaving(true);
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockCount: newCount }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        toast.error(message ?? 'Failed to update stock');
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, stockCount: newCount } : r)),
      );
      setStockEditId(null);
      toast.success('Stock updated');
    } catch {
      toast.error('Failed to update stock');
    } finally {
      setStockSaving(false);
    }
  }

  // Refresh the snapshot for a filter key — passed the same key the stat strip
  // emits (`'all' | 'inStock' | 'lowStock' | 'critical'`).
  function refreshSnapshot(filterKey: string) {
    if (filterKey === 'all') {
      setTabSnapshot(new Set(rows.map((r) => r.id)));
      return;
    }
    const matched = rows.filter((r) => {
      const par = CATEGORY_PAR[r.category] ?? DEFAULT_PAR;
      const state = getStockState(r.stockCount, par);
      if (filterKey === 'inStock') return state === 'healthy' || state === 'over';
      if (filterKey === 'lowStock') return state === 'low';
      if (filterKey === 'critical') return state === 'critical';
      return true;
    });
    setTabSnapshot(new Set(matched.map((r) => r.id)));
  }

  return {
    rows,
    tabSnapshot,
    refreshSnapshot,
    stockEdit: {
      id: stockEditId,
      value: stockEditValue,
      saving: stockSaving,
      setValue: setStockEditValue,
      begin: beginEdit,
      cancel: cancelEdit,
      save: saveStock,
    },
    reorder: {
      row: reorderRow,
      open: setReorderRow,
      close: () => setReorderRow(null),
    },
  };
}
