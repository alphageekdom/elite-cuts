'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InventoryRow } from './InventoryClient';

type Props = {
  rows: InventoryRow[];
  onClose: () => void;
};

// "Big change" warning threshold — flagged in the UI but not blocking.
const OUTLIER_RATIO = 0.5;

export default function StocktakeDrawer({ rows, onClose }: Props) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, String(r.stockCount)])),
  );
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Search filters visible rows but never wipes typed counts — the changed
  // tally still reflects edits to rows that have scrolled out of view.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.supplier ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  // Rows whose typed count differs from the on-record stock. We submit only
  // these — the stocktake doc stays a record of real change, not a no-op.
  const changedEntries = useMemo(() => {
    const out: { row: InventoryRow; counted: number; delta: number }[] = [];
    for (const r of rows) {
      const raw = counts[r.id];
      if (raw === '' || raw === undefined) continue;
      const counted = Number.parseInt(raw, 10);
      if (!Number.isFinite(counted) || counted < 0) continue;
      const delta = counted - r.stockCount;
      if (delta !== 0) out.push({ row: r, counted, delta });
    }
    return out;
  }, [rows, counts]);

  const totalDelta = changedEntries.reduce((acc, e) => acc + e.delta, 0);

  // Group rows by category so the long list reads as one cohesive recount.
  const grouped = useMemo(() => {
    const byCategory = new Map<string, InventoryRow[]>();
    for (const r of visibleRows) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r);
      byCategory.set(r.category, list);
    }
    return [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleRows]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (changedEntries.length === 0) {
      toast.info('No changes to commit');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/stocktakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: changedEntries.map((e) => ({
            productId: e.row.id,
            countedStock: e.counted,
          })),
          note: note.trim(),
        }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({}));
        toast.error(message ?? 'Stocktake failed');
        return;
      }
      toast.success(
        `Stocktake committed: ${changedEntries.length} cut${changedEntries.length !== 1 ? 's' : ''} updated`,
      );
      onClose();
      router.refresh();
    } catch {
      toast.error('Stocktake failed');
    } finally {
      setSaving(false);
    }
  }

  const fieldCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2.5 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside className="relative bg-paper w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-line-soft shrink-0">
          <div className="pr-4">
            <div className="text-[11px] tracking-widest uppercase text-muted mb-1.5">Stocktake</div>
            <h2 className="font-display text-[22px] font-normal tracking-tight leading-snug">
              Recount <em className="italic text-oxblood font-normal">all cuts.</em>
            </h2>
            <p className="text-[12px] text-muted mt-1.5 max-w-[44ch]">
              Edit the count next to any cut that doesn&apos;t match the case.
              Unchanged rows are skipped; only the differences land in the stocktake record.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center text-muted hover:text-ink hover:bg-cream-deep transition-colors shrink-0 mt-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="px-6 pt-5 pb-3 shrink-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by cut, category, or supplier…"
              className="w-full bg-cream border border-line-soft rounded-lg px-4 py-2 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-5">
            {grouped.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">
                {search.trim() ? 'No cuts match that filter.' : 'No cuts to recount.'}
              </p>
            ) : (
              grouped.map(([category, rowsInCategory]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <div className="text-[11px] font-medium tracking-[0.2em] uppercase text-muted mb-2">
                    {category}
                  </div>
                  <div className="border border-line-soft rounded-lg overflow-hidden">
                    {rowsInCategory.map((r, idx) => {
                      const raw = counts[r.id];
                      const counted = Number.parseInt(raw, 10);
                      const validCount = Number.isFinite(counted) && counted >= 0;
                      const delta = validCount ? counted - r.stockCount : 0;
                      const isOutlier =
                        validCount && r.stockCount > 0 && Math.abs(delta) / r.stockCount > OUTLIER_RATIO;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 px-4 py-2.5 text-[14px] ${
                            idx > 0 ? 'border-t border-line-soft' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium text-ink">{r.name}</div>
                            <div className="text-[12px] text-muted mt-0.5">
                              On record: {r.stockCount}
                              {delta !== 0 && (
                                <>
                                  {' '}·{' '}
                                  <span className={delta > 0 ? 'text-green' : 'text-oxblood'}>
                                    {delta > 0 ? `+${delta}` : delta}
                                  </span>
                                </>
                              )}
                              {isOutlier && (
                                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-soft text-amber text-[10px] font-medium tracking-[0.04em]">
                                  Big change — confirm?
                                </span>
                              )}
                            </div>
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={raw ?? ''}
                            onChange={(e) =>
                              setCounts((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            className="w-20 text-right bg-cream border border-line-soft rounded-lg px-3 py-1.5 text-[14px] focus:outline-none focus:border-ink transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="mt-6">
              <label className="block text-[12px] font-medium text-ink-soft tracking-widest uppercase mb-1.5">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Friday close — case + walk-in"
                maxLength={500}
                className={fieldCls}
              />
            </div>
          </div>

          {/* Footer summary + submit */}
          <div className="px-6 py-4 border-t border-line-soft shrink-0 flex items-center justify-between gap-4 bg-cream-deep/30">
            <div className="text-[12px] text-ink-soft">
              {changedEntries.length === 0 ? (
                <span>No changes yet</span>
              ) : (
                <>
                  <span className="font-medium text-ink">{changedEntries.length}</span>{' '}
                  {changedEntries.length === 1 ? 'change' : 'changes'} ·{' '}
                  <span className={totalDelta >= 0 ? 'text-green' : 'text-oxblood'}>
                    {totalDelta >= 0 ? `+${totalDelta}` : totalDelta}
                  </span>{' '}
                  total
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={saving || changedEntries.length === 0}
              className="bg-ink text-cream text-[13px] font-medium tracking-[0.04em] px-5 py-2.5 rounded-full hover:bg-oxblood transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Committing…' : 'Commit stocktake'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
