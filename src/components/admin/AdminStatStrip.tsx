import { statCellBorderClasses } from '@/lib/format';

export type StatCell = {
  id?: string;         // React key when multiple cells share the same filter key
  key: string;         // filter key passed to onSelect
  label: string;
  value: string | number;
  meta: string;
  dotClass?: string;   // Tailwind class: 'bg-green', 'bg-oxblood', 'bg-camel', 'bg-muted', etc.
  badge?: string;      // suffix rendered after value (e.g. '!', 'new')
  clickable?: boolean; // defaults to true; false for display-only cells
};

type Props = {
  cells: StatCell[];
  activeKey: string;
  onSelect: (key: string) => void;
  cols?: string;
  // Breakpoint at which the strip collapses to a single row. Must match the
  // widest breakpoint in `cols` so border-collapse logic stays in sync.
  wideBreakpoint?: 'lg' | 'xl';
};

export default function AdminStatStrip({
  cells,
  activeKey,
  onSelect,
  cols = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  wideBreakpoint = 'lg',
}: Props) {
  return (
    <div className={`grid ${cols} bg-paper border border-line-soft rounded-sm mb-6 overflow-hidden`}>
      {cells.map((cell, idx) => {
        const clickable = cell.clickable !== false;
        const isActive = clickable && activeKey === cell.key;
        return (
          <button
            key={cell.id ?? cell.key}
            type="button"
            onClick={() => clickable && onSelect(cell.key)}
            disabled={!clickable}
            className={[
              'relative text-left px-4 py-4 sm:px-5 sm:py-5 transition-colors',
              clickable ? 'cursor-pointer' : 'cursor-default',
              statCellBorderClasses(idx, cells.length, wideBreakpoint),
              isActive ? 'bg-cream' : clickable ? 'hover:bg-cream' : '',
            ].join(' ')}
          >
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood" />
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] tracking-[0.18em] uppercase text-muted leading-tight">
                {cell.label}
              </span>
              {cell.dotClass && (
                <span className={`w-2 h-2 rounded-full ${cell.dotClass}`} />
              )}
            </div>
            <div className="font-display text-[22px] sm:text-[28px] font-normal leading-none tracking-tight mb-1">
              {cell.value}
              {cell.badge && (
                <em className="not-italic text-oxblood text-sm ml-0.5">{cell.badge}</em>
              )}
            </div>
            <div className="font-mono text-[11px] text-muted tracking-[0.04em]">{cell.meta}</div>
          </button>
        );
      })}
    </div>
  );
}
