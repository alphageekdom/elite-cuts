'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import SortPopover, { type SortOption } from '@/components/ui/SortPopover';

import {
  CATEGORY_FILTERS,
  SORT_OPTIONS,
  isCategoryFilter,
  isSortValue,
  type CategoryFilter,
  type SortValue,
} from './catalogConfig';

const SEARCH_DEBOUNCE_MS = 350;

const SearchIcon = ({ className }: { className: string }) => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className={className}
  >
    <circle cx='11' cy='11' r='8' />
    <path d='M21 21l-4.35-4.35' />
  </svg>
);

type CatalogFilterBarProps = {
  /**
   * Per-category product counts (plus an `All` total), computed server-side
   * in one grouped pass against the same visibility filter the listing uses.
   */
  categoryCounts: Record<string, number>;
};

const CatalogFilterBar = ({ categoryCounts }: CatalogFilterBarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCategory = searchParams.get('category');
  const activeCategory: CategoryFilter =
    rawCategory && isCategoryFilter(rawCategory) ? rawCategory : 'All';

  const rawSort = searchParams.get('sort');
  const activeSort: SortValue =
    rawSort && isSortValue(rawSort) ? rawSort : 'featured';

  const initialQuery = searchParams.get('q') ?? '';

  // Local input state so typing is responsive. URL push is debounced below.
  // Sync external nav (chip removal, category change) back into the input.
  const [query, setQuery] = useState(initialQuery);
  // Mobile-only search reveal. Starts open when the user arrives with a search
  // already applied, so the input that produced the results stays visible.
  const [searchOpen, setSearchOpen] = useState(initialQuery !== '');
  const lastSyncedQuery = useRef(initialQuery);
  useEffect(() => {
    if (initialQuery !== lastSyncedQuery.current) {
      setQuery(initialQuery);
      lastSyncedQuery.current = initialQuery;
    }
  }, [initialQuery]);

  const buildUrl = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    next.delete('page'); // any filter/sort/search change resets pagination
    const qs = next.toString();
    return qs ? `/products?${qs}` : '/products';
  };

  // The catalog re-queries the database on every filter change, so a click can
  // sit for a beat with nothing on screen acknowledging it. `isPending` fades
  // the toolbar while the new results are in flight.
  const [isPending, startTransition] = useTransition();

  const pushCategory = (category: CategoryFilter) => {
    startTransition(() => {
      router.push(
        buildUrl((p) => {
          if (category === 'All') p.delete('category');
          else p.set('category', category);
        }),
        { scroll: false }
      );
    });
  };

  const pushSort = (sort: SortValue) => {
    startTransition(() => {
      router.push(
        buildUrl((p) => {
          if (sort === 'featured') p.delete('sort');
          else p.set('sort', sort);
        }),
        { scroll: false }
      );
    });
  };

  // This fires on every settled debounce tick, so pushing each one stacks a
  // history entry per typing pause and Back walks through "ribe" then "ri".
  // Starting a search pushes once, so Back still returns to the unfiltered
  // case; refining an existing one replaces. Category and sort always push —
  // those are single deliberate actions worth undoing individually.
  const pushQuery = (next: string) => {
    const url = buildUrl((p) => {
      const trimmed = next.trim();
      if (trimmed) p.set('q', trimmed);
      else p.delete('q');
    });
    const refining = initialQuery !== '';
    if (refining) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  // Debounced URL sync as the user types. Intentionally omits pushQuery from
  // deps — it closes over searchParams and would reset the timer each keystroke.
  useEffect(() => {
    if (query === initialQuery) return;
    const t = setTimeout(() => pushQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, initialQuery]);

  const onSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Closing the reveal also drops the search. Leaving it applied while the
  // input that produced it is hidden reads as a stuck filter — the only clue
  // left would be the removable chip further down the page.
  const toggleSearch = () => {
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    if (query.trim()) {
      setQuery('');
      pushQuery('');
    }
    setSearchOpen(false);
  };

  // The pill row hides its scrollbar, so it needs a fade to signal that more
  // categories sit off-edge. Whether it overflows depends on the row's width
  // AND its content (a category renamed longer, or a count crossing into two
  // digits, both tip it over), so re-measure on resize and on count changes.
  const pillRowRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  // Keyed on the counts by value, not the object: `categoryCounts` is rebuilt
  // on every server render, so depending on it directly would tear down and
  // rebuild the observer on every navigation.
  const countsKey = CATEGORY_FILTERS.map((c) => categoryCounts[c] ?? 0).join();
  useEffect(() => {
    const el = pillRowRef.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [countsKey]);

  // Options for the responsive Category dropdown (shown below lg, where the
  // pill row would otherwise scroll out of view). Counts ride in the label
  // since SortPopover renders a plain string.
  const categoryOptions: readonly SortOption<CategoryFilter>[] =
    CATEGORY_FILTERS.map((c) => {
      const count = categoryCounts[c] ?? 0;
      return { value: c, label: count > 0 ? `${c} (${count})` : c };
    });

  return (
    <div className='sticky top-0 z-30 border-y border-line-soft bg-cream/95 py-4 backdrop-blur-md'>
      <div
        className={`mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 transition-opacity duration-200 motion-reduce:transition-none md:px-8 ${
          isPending ? 'opacity-60' : 'opacity-100'
        }`}
      >
        {/* Category — pill row at lg+, SortPopover dropdown below lg. The
            first pass used `sm:` (640px) but pills scrolled out of view on
            iPad portrait, so lg: (1024px) is the breakpoint.

            The row is `min-w-0 flex-1` so it shrinks and scrolls internally
            rather than wrapping search+sort onto their own line: the count
            badges widened the pills past what fits beside search+sort inside
            max-w-7xl, and a flex item at full intrinsic width would push the
            whole toolbar to two rows at every desktop width. */}
        <div className='lg:hidden'>
          <SortPopover<CategoryFilter>
            value={activeCategory}
            options={categoryOptions}
            onChange={pushCategory}
            prefix='Category:'
            panelLabel='Category'
            align='left'
            hidePrefixBelowSm
          />
        </div>
        {/* Not a tablist: these navigate and swap paginated results rather
            than revealing a tabpanel, and the APG tab model (roving tabindex,
            arrow keys, aria-controls) was never implemented. Plain buttons
            with aria-pressed describe what they actually do. */}
        <div className='relative hidden min-w-0 flex-1 lg:block'>
          <div
            ref={pillRowRef}
            role='group'
            aria-label='Filter by category'
            className='flex gap-1 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden'
          >
            {CATEGORY_FILTERS.map((category) => {
              const on = category === activeCategory;
              const count = categoryCounts[category] ?? 0;
              return (
                <button
                  key={category}
                  type='button'
                  aria-pressed={on}
                  onClick={() => pushCategory(category)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none ${
                    on
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                  }`}
                >
                  {category}
                  {count > 0 && (
                    <>
                      <span
                        aria-hidden='true'
                        className={`text-[11px] tabular-nums ${
                          on ? 'text-cream/60' : 'text-muted'
                        }`}
                      >
                        {count}
                      </span>
                      {/* A bare digit reads as "Beef 7" to a screen reader —
                          state the unit instead. */}
                      <span className='sr-only'>{count} cuts</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Scroll-hint fade — the pill row hides its scrollbar, so without
              this a trailing category can sit off-edge with no signal. Only
              rendered when the row actually overflows. */}
          {overflows && (
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-cream to-transparent'
            />
          )}
        </div>

        <div className='flex items-center gap-2'>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pushQuery(query);
            }}
            role='search'
            className='hidden items-center gap-2.5 rounded-full border border-line bg-paper px-4 py-2 transition-colors duration-300 focus-within:border-ink sm:flex'
          >
            <SearchIcon className='h-3.5 w-3.5 shrink-0 text-muted' />
            <label htmlFor='catalog-search' className='sr-only'>
              Search the case
            </label>
            <input
              id='catalog-search'
              type='search'
              value={query}
              onChange={onSearchChange}
              placeholder='Search the case…'
              className='w-40 border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted'
            />
          </form>

          {/* Below sm the search form above is hidden and the catalog had no
              search at all. An icon keeps the toolbar one row at 360px; the
              input drops onto its own row only once it's actually wanted, so
              the sticky bar doesn't permanently cost ~54px of phone screen. */}
          <button
            type='button'
            onClick={toggleSearch}
            aria-expanded={searchOpen}
            // Only reference the form while it exists — it unmounts on close.
            aria-controls={searchOpen ? 'catalog-search-mobile' : undefined}
            aria-label={searchOpen ? 'Close search' : 'Search the case'}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none sm:hidden ${
              searchOpen
                ? 'border-ink bg-ink text-cream'
                : 'border-line text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            <SearchIcon className='h-3.5 w-3.5' />
          </button>

          <SortPopover<SortValue>
            value={activeSort}
            options={SORT_OPTIONS}
            onChange={pushSort}
            hidePrefixBelowSm
          />
        </div>

        {searchOpen && (
          <form
            id='catalog-search-mobile'
            onSubmit={(e) => {
              e.preventDefault();
              pushQuery(query);
            }}
            role='search'
            className='flex w-full items-center gap-2.5 rounded-full border border-line bg-paper px-4 py-2.5 transition-colors duration-300 focus-within:border-ink sm:hidden'
          >
            <SearchIcon className='h-3.5 w-3.5 shrink-0 text-muted' />
            <label htmlFor='catalog-search-mobile-input' className='sr-only'>
              Search the case
            </label>
            <input
              id='catalog-search-mobile-input'
              type='search'
              value={query}
              onChange={onSearchChange}
              placeholder='Search the case…'
              className='w-full border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted'
            />
          </form>
        )}
      </div>
    </div>
  );
};

export default CatalogFilterBar;
