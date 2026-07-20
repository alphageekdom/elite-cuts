import Link from 'next/link';

import CheckIcon from '@/components/uielements/CheckIcon';
import LinkPendingDot from '@/components/product/LinkPendingDot';

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
  /** Whether the listing is currently restricted to in-stock cuts. */
  inStockOnly: boolean;
  /** URL that flips the in-stock restriction, preserving every other filter. */
  inStockHref: string;
};

const ResultsBar = ({
  start,
  end,
  total,
  activeFilters,
  inStockOnly,
  inStockHref,
}: ResultsBarProps) => (
  <div className='flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
    {/* Zero results says nothing here — the empty-state block below owns
        that message and carries the one real recovery action.

        aria-atomic so a filter change announces the whole sentence: the count
        is split across two <strong>s, and without it a screen reader reads
        only the fragment that changed. */}
    <div role='status' aria-atomic='true' className='text-[13px] text-muted'>
      {total > 0 && (
        <>
          Showing{' '}
          <strong className='font-medium text-ink'>
            {start}–{end}
          </strong>{' '}
          of <strong className='font-medium text-ink'>{total} cuts</strong>
        </>
      )}
    </div>

    <div className='flex flex-wrap items-center gap-2'>
      <Link
        href={inStockHref}
        scroll={false}
        // A link carries role=link, where aria-pressed is invalid — the
        // toggle state rides in the accessible name instead.
        aria-label={
          inStockOnly
            ? 'In stock only, on — show out-of-stock cuts too'
            : 'In stock only, off — hide out-of-stock cuts'
        }
        className={`inline-flex min-h-10 items-center gap-2 rounded-full border py-2.5 pr-4 pl-3.5 text-[12px] font-medium transition-[background-color,border-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none ${
          inStockOnly
            ? 'border-green bg-green-soft text-ink'
            : 'border-line bg-paper text-ink-soft hover:border-ink hover:text-ink'
        }`}
      >
        <span
          aria-hidden='true'
          className={`h-1.5 w-1.5 rounded-full ${
            inStockOnly ? 'bg-green' : 'bg-muted'
          }`}
        />
        In stock only
        {inStockOnly && <CheckIcon className='h-2.5 w-2.5' />}
        <LinkPendingDot />
      </Link>

      {activeFilters.length > 0 && (
        <ul className='flex flex-wrap gap-2'>
          {activeFilters.map((filter) => (
            <li key={filter.label}>
              <Link
                href={filter.removeHref}
                scroll={false}
                className='group inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink py-2.5 pr-2.5 pl-3.5 text-[12px] font-medium text-cream transition-[background-color] duration-300 hover:bg-oxblood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none'
              >
                {/* Capped: the search chip echoes raw `q`, and a long query
                    would otherwise stretch the chip past the viewport. */}
                <span className='max-w-[22ch] truncate'>{filter.label}</span>
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
  </div>
);

export default ResultsBar;
