import Link from 'next/link';

import LinkPendingDot from '@/components/product/LinkPendingDot';
import ChevronIcon from '@/components/ui/icons/ChevronIcon';

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

const NAV_BTN =
  'inline-flex items-center gap-2 rounded-full border border-line px-4.5 py-2.5 text-[13px] font-medium text-ink transition-[background-color,border-color] duration-300 hover:border-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none';
const NAV_BTN_DISABLED =
  'inline-flex items-center gap-2 rounded-full border border-line px-4.5 py-2.5 text-[13px] font-medium text-ink opacity-30 pointer-events-none';

// The two disabled controls below carry `role='link'`, and it is load-bearing
// rather than decoration. `aria-disabled` is not a global attribute — it is
// only exposed on roles that support it, and a bare `<span>` maps to `generic`,
// which does not. Without a role the attribute is inert: a screen reader read
// "Previous" as plain text, indistinguishable from static copy, while sighted
// users saw it dimmed to 30%. Measured against a control rig — `<button
// disabled>`, `<button aria-disabled>` and `<a href aria-disabled>` all report
// `[disabled]` in the accessibility tree; the bare span reported no role and no
// state at all.
//
// Deliberately not focusable. A disabled control that takes a tab stop and then
// does nothing is worse than one that doesn't, and the "Page 1 of 4" line above
// already states the position. Every other `aria-disabled` in this app sits on
// a real `<button>`; this file was the only place it sat on something that
// could not carry it.
const NAV_DISABLED_ROLE = 'link' as const;

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
          <span
            className={NAV_BTN_DISABLED}
            role={NAV_DISABLED_ROLE}
            aria-disabled='true'
          >
            <ChevronIcon direction='left' className='h-3 w-3' />
            Previous
          </span>
        ) : (
          <Link href={hrefForPage(page - 1)} scroll={false} className={NAV_BTN}>
            <ChevronIcon direction='left' className='h-3 w-3' />
            Previous
            <LinkPendingDot />
          </Link>
        )}

        {/* Hidden below sm. This row is 384px wide with the numbers in it —
            two ~99px nav buttons plus the list — which overflows every phone
            viewport and was the only in-flow element on the catalog reaching
            past the edge. Below sm the nav is `flex-col`, so the "Page 1 of 4"
            line sits directly above this and already states the position; the
            numbers are duplicating it at exactly the width where they don't
            fit. Previous/Next still page through. Trimming padding instead was
            measured and doesn't work: every saving available (list margin, both
            buttons' padding, the inner gaps) comes to ~44px against the ~80px
            needed at 320px. */}
        <ol className='hidden items-center gap-1 sm:mx-3 sm:inline-flex'>
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
          <span
            className={NAV_BTN_DISABLED}
            role={NAV_DISABLED_ROLE}
            aria-disabled='true'
          >
            Next
            <ChevronIcon direction='right' className='h-3 w-3' />
          </span>
        ) : (
          <Link href={hrefForPage(page + 1)} scroll={false} className={NAV_BTN}>
            Next
            <ChevronIcon direction='right' className='h-3 w-3' />
            <LinkPendingDot />
          </Link>
        )}
      </div>
    </nav>
  );
};

export default CatalogPagination;
