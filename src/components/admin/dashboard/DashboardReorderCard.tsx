import Link from 'next/link';

export type ReorderRow = {
  id: string;
  name: string;
  stock: number;
  par: number;
  /** 0–100, capped so a par of 0 can't produce a runaway bar. */
  pct: number;
  supplier: string | null;
};

type Props = {
  rows: ReorderRow[];
  criticalCount: number;
};

// Cuts sitting below par, worst first. The design's "Draft a supplier order"
// button is not here: there is no purchase-order concept in this project. The
// card links to Inventory, where the existing reorder drawer already logs a
// delivery against a supplier — the real version of that action.

export default function DashboardReorderCard({ rows, criticalCount }: Props) {
  const empty = rows.length === 0;

  return (
    <section
      className={`rounded-sm border px-6 py-6 ${
        empty ? 'border-line-soft bg-paper' : 'border-oxblood/20 bg-oxblood/8'
      }`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          className={`font-display text-[21px] leading-snug tracking-[-0.015em] ${
            empty ? '' : 'text-oxblood-deep'
          }`}
        >
          {empty ? 'Stock levels' : 'Reorder now'}
        </h2>
        {criticalCount > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] whitespace-nowrap text-oxblood">
            {criticalCount} critical
          </span>
        )}
      </div>

      {empty ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
          Every cut is at or above its par level. Nothing needs reordering today.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[14px]">{row.name}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-oxblood">
                  {row.stock} / {row.par}
                </span>
              </div>
              <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-oxblood/15"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-oxblood"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[12px] text-ink-soft">
                {row.pct}% of par
                {row.supplier ? ` · ${row.supplier}` : ' · no supplier on file'}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/dashboard/inventory"
        className={`mt-6 block rounded-sm px-4 py-3 text-center text-[13.5px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${
          empty
            ? 'border border-line text-ink-soft hover:bg-cream'
            : 'bg-oxblood text-cream hover:bg-oxblood-deep'
        }`}
      >
        {empty ? 'Open inventory' : 'Log a delivery'}
      </Link>
    </section>
  );
}
