'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { InventoryRow } from '@/lib/inventory';
import { DrawerHeader, DrawerFooter } from '@/components/admin/DrawerChrome';

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
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rows whose typed count differs from on-record stock. Drives the footer
  // tally, the per-row tint, and the "Show only changed" filter — keep these
  // three derived from one source so they can't drift.
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

  const changedIds = useMemo(
    () => new Set(changedEntries.map((e) => e.row.id)),
    [changedEntries],
  );

  // Search filters visible rows but never wipes typed counts — the changed
  // tally still reflects edits to rows that have scrolled out of view. The
  // "Show only changed" toggle composes on top of the search filter.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q),
      );
    }
    if (showOnlyChanged) out = out.filter((r) => changedIds.has(r.id));
    return out;
  }, [rows, search, showOnlyChanged, changedIds]);

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

  const inputCls =
    'w-full bg-cream border border-line-soft rounded-lg px-4 py-2 text-[14px] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors';

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <DrawerHeader
        eyebrow="Stocktake"
        title="Recount all cuts"
        titleId="stocktake-form-title"
        hideSubOnMobile
        sub="Edit the count next to any cut that doesn't match the case. Unchanged rows are skipped; only the differences land in the stocktake record."
        onClose={onClose}
      />
          {/* Filter + Note stacked above the scroll list so the Note is
              visible without scrolling past 30 rows. */}
          <div className="px-6 pt-5 pb-3 shrink-0 space-y-2.5">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by cut, category, or supplier…"
              className={inputCls}
              aria-label="Filter cuts"
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional) — e.g. Friday close"
              maxLength={500}
              className={inputCls}
              aria-label="Stocktake note"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-5">
            {grouped.length === 0 ? (
              <p className="text-muted text-sm py-8 text-center">
                {showOnlyChanged
                  ? 'No changes yet — toggle off to see every cut.'
                  : search.trim()
                  ? 'No cuts match that filter.'
                  : 'No cuts to recount.'}
              </p>
            ) : (
              grouped.map(([category, rowsInCategory]) => (
                <div key={category} className="mb-6 last:mb-0">
                  {/* Sticky so the active category stays visible while
                      scrolling through 30 cuts. -mx-6 / px-6 spans the full
                      scroll-container width so rows don't peek through the
                      gutter behind the label. */}
                  <div className="sticky top-0 z-10 bg-paper -mx-6 px-6 py-2 mb-1 text-[11px] font-medium tracking-[0.2em] uppercase text-muted">
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
                      const isChanged = delta !== 0;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors ${
                            idx > 0 ? 'border-t border-line-soft' : ''
                          } ${isChanged && !showOnlyChanged ? 'bg-camel/8' : ''}`}
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
                                <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-soft text-amber-deep text-[10px] font-medium tracking-[0.04em]">
                                  Big change — confirm?
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Named per cut: thirty identical number boxes with
                              no label read as thirty anonymous spin buttons. */}
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
                            aria-label={`Counted stock for ${r.name}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer — changes count becomes a toggle that filters the list to
              only changed rows once the admin has edits. */}
      <DrawerFooter
        leading={
          changedEntries.length === 0 ? (
            <span className="text-[12px] text-muted">No changes yet</span>
          ) : (
            <button
              type="button"
              onClick={() => setShowOnlyChanged((prev) => !prev)}
              aria-pressed={showOnlyChanged}
              title={showOnlyChanged ? 'Showing only changed rows — tap to show all' : 'Tap to show only changed rows'}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
                showOnlyChanged
                  ? 'border-camel bg-camel/15 text-ink'
                  : 'border-line-soft text-ink-soft hover:border-ink hover:bg-cream'
              }`}
            >
              <span className="font-medium text-ink">{changedEntries.length}</span>
              <span>{changedEntries.length === 1 ? 'change' : 'changes'}</span>
              <span className="text-muted">·</span>
              <span className={totalDelta >= 0 ? 'text-green' : 'text-oxblood'}>
                {totalDelta >= 0 ? `+${totalDelta}` : totalDelta}
              </span>
              <span>total</span>
              {showOnlyChanged && (
                <span className="ml-1 text-[10px] uppercase tracking-widest text-camel-deep">· filtered</span>
              )}
            </button>
          )
        }
        onCancel={onClose}
        submitType="submit"
        submitLabel="Commit stocktake"
        busyLabel="Committing…"
        busy={saving}
        disabled={changedEntries.length === 0}
      />
    </form>
  );
}
