import Link from 'next/link';

type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  /** Build the href for a target page, preserving all other searchParams. */
  hrefForPage: (target: number) => string;
};

// Boundary-window: always show 1, current ±1, last; collapse the rest with
// ellipsis. Works for any total ≥ 1 — single-page cases are handled by the
// caller (which does not render the component when totalPages ≤ 1).
const buildPageList = (page: number, totalPages: number): (number | 'ellipsis')[] => {
  const items: (number | 'ellipsis')[] = [];
  const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);

  let prev: number | null = null;
  for (let i = 1; i <= totalPages; i++) {
    if (!window.has(i)) continue;
    if (prev !== null && i - prev > 1) items.push('ellipsis');
    items.push(i);
    prev = i;
  }
  return items;
};

const ChevronLeft = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3 w-3'
  >
    <polyline points='15 18 9 12 15 6' />
  </svg>
);

const ChevronRight = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-3 w-3'
  >
    <polyline points='9 18 15 12 9 6' />
  </svg>
);

const NAV_BTN =
  'inline-flex items-center gap-2 rounded-full border border-line px-4.5 py-2.5 text-[13px] font-medium text-ink transition-[background-color,border-color] duration-300 hover:border-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none';
const NAV_BTN_DISABLED =
  'inline-flex items-center gap-2 rounded-full border border-line px-4.5 py-2.5 text-[13px] font-medium text-ink opacity-30 pointer-events-none';

const CatalogPagination = ({
  page,
  totalPages,
  hrefForPage,
}: CatalogPaginationProps) => {
  if (totalPages <= 1) return null;

  const pageList = buildPageList(page, totalPages);
  const prevDisabled = page === 1;
  const nextDisabled = page === totalPages;

  return (
    <nav
      aria-label='Pagination'
      className='mt-20 flex flex-col items-center justify-between gap-6 border-t border-line-soft pt-12 sm:flex-row sm:gap-4'
    >
      <p className='font-mono text-[12px] tracking-[0.04em] text-muted'>
        Page <strong className='font-medium text-ink'>{page}</strong> of{' '}
        <strong className='font-medium text-ink'>{totalPages}</strong>
      </p>

      <div className='inline-flex items-center gap-1'>
        {prevDisabled ? (
          <span className={NAV_BTN_DISABLED} aria-disabled='true'>
            <ChevronLeft />
            Previous
          </span>
        ) : (
          <Link href={hrefForPage(page - 1)} scroll={false} className={NAV_BTN}>
            <ChevronLeft />
            Previous
          </Link>
        )}

        <ol className='mx-3 inline-flex items-center gap-1'>
          {pageList.map((item, i) =>
            item === 'ellipsis' ? (
              <li
                key={`ellipsis-${i}`}
                aria-hidden='true'
                className='px-1.5 text-muted'
              >
                …
              </li>
            ) : (
              <li key={item}>
                {item === page ? (
                  <span
                    aria-current='page'
                    className='grid h-9 w-9 place-items-center rounded-full bg-ink font-display text-sm text-cream'
                  >
                    {item}
                  </span>
                ) : (
                  <Link
                    href={hrefForPage(item)}
                    scroll={false}
                    aria-label={`Go to page ${item}`}
                    className='grid h-9 w-9 place-items-center rounded-full font-display text-sm text-ink-soft transition-[background-color,color] duration-300 hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none'
                  >
                    {item}
                  </Link>
                )}
              </li>
            )
          )}
        </ol>

        {nextDisabled ? (
          <span className={NAV_BTN_DISABLED} aria-disabled='true'>
            Next
            <ChevronRight />
          </span>
        ) : (
          <Link href={hrefForPage(page + 1)} scroll={false} className={NAV_BTN}>
            Next
            <ChevronRight />
          </Link>
        )}
      </div>
    </nav>
  );
};

export default CatalogPagination;
