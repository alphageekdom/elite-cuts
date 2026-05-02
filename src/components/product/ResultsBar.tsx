import Link from 'next/link';

type ActiveFilter = {
  label: string;
  /** URL the user lands on when removing this filter (preserves the others). */
  removeHref: string;
};

type ResultsBarProps = {
  start: number;
  end: number;
  total: number;
  activeFilters: readonly ActiveFilter[];
};

const ResultsBar = ({ start, end, total, activeFilters }: ResultsBarProps) => (
  <div className='flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
    <div className='text-[13px] text-muted'>
      {total === 0 ? (
        <>
          No cuts match your filters — <span className='font-medium text-ink'>try clearing them.</span>
        </>
      ) : (
        <>
          Showing{' '}
          <strong className='font-medium text-ink'>
            {start}–{end}
          </strong>{' '}
          of <strong className='font-medium text-ink'>{total} cuts</strong>
        </>
      )}
    </div>

    {activeFilters.length > 0 && (
      <ul className='flex flex-wrap gap-2'>
        {activeFilters.map((filter) => (
          <li key={filter.label}>
            <Link
              href={filter.removeHref}
              scroll={false}
              className='group inline-flex items-center gap-1.5 rounded-full bg-ink py-1.5 pr-2 pl-3 text-[12px] font-medium text-cream transition-[background-color] duration-300 hover:bg-oxblood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none'
            >
              {filter.label}
              <span
                aria-hidden='true'
                className='grid h-4 w-4 place-items-center rounded-full bg-cream/20 transition-[background-color] duration-300 group-hover:bg-cream/35 motion-reduce:transition-none'
              >
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={3}
                  className='h-2 w-2'
                >
                  <line x1='6' y1='6' x2='18' y2='18' />
                  <line x1='18' y1='6' x2='6' y2='18' />
                </svg>
              </span>
              <span className='sr-only'>Remove filter</span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default ResultsBar;
