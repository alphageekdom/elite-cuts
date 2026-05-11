type Props = {
  page: number;
  totalPages: number;
  filteredCount: number;
  perPage: number;
  pageSizes?: number[];
  noun?: string;
  showPerPage?: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
};

export default function AdminPagination({
  page,
  totalPages,
  filteredCount,
  perPage,
  pageSizes = [8, 20, 50],
  noun = 'items',
  showPerPage = true,
  onPageChange,
  onPerPageChange,
}: Props) {
  const from = filteredCount === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, filteredCount);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-cream border-t border-line-soft flex-wrap gap-3">
      <div className="font-mono text-[12px] text-muted tracking-[0.04em]">
        Showing{' '}
        <strong className="text-ink font-medium">{from}–{to}</strong>{' '}
        of <strong className="text-ink font-medium">{filteredCount}</strong> {noun}
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex items-center gap-0.5 mx-2">
          {(() => {
            const pageBtn = (n: number) => (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={`w-8 h-8 rounded-full font-display text-[13px] transition-colors ${
                  page === n ? 'bg-ink text-cream' : 'text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {n}
              </button>
            );
            const ellipsis = (key: string) => (
              <span key={key} className="px-1 text-muted">…</span>
            );

            if (totalPages <= 7) {
              return Array.from({ length: totalPages }, (_, i) => pageBtn(i + 1));
            }

            const window = 2;
            const lo = Math.max(2, page - window);
            const hi = Math.min(totalPages - 1, page + window);
            const items = [];
            items.push(pageBtn(1));
            if (lo > 2) items.push(ellipsis('lo'));
            for (let n = lo; n <= hi; n++) items.push(pageBtn(n));
            if (hi < totalPages - 1) items.push(ellipsis('hi'));
            items.push(pageBtn(totalPages));
            return items;
          })()}
        </div>

        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="w-8 h-8 rounded-full border border-line text-ink-soft grid place-items-center hover:border-ink hover:bg-paper hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-2.75 h-2.75" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {showPerPage && onPerPageChange && (
        <div className="hidden sm:flex items-center gap-2 font-mono text-[12px] text-muted">
          <span>Per page</span>
          <select
            className="appearance-none bg-paper border border-line rounded-full pl-3 pr-6 py-1.5 text-[12px] text-ink font-mono cursor-pointer bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238A7F73%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-no-repeat bg-position-[right_8px_center]"
            value={perPage}
            onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          >
            {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
