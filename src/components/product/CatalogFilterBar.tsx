'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CATEGORY_FILTERS,
  SORT_OPTIONS,
  isCategoryFilter,
  isSortValue,
  type CategoryFilter,
  type SortValue,
} from './catalogConfig';

const SEARCH_DEBOUNCE_MS = 350;

const CatalogFilterBar = () => {
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

  const pushCategory = (category: CategoryFilter) => {
    router.push(
      buildUrl((p) => {
        if (category === 'All') p.delete('category');
        else p.set('category', category);
      }),
      { scroll: false }
    );
  };

  const pushSort = (sort: SortValue) => {
    router.push(
      buildUrl((p) => {
        if (sort === 'featured') p.delete('sort');
        else p.set('sort', sort);
      }),
      { scroll: false }
    );
  };

  const pushQuery = (next: string) => {
    router.push(
      buildUrl((p) => {
        const trimmed = next.trim();
        if (trimmed) p.set('q', trimmed);
        else p.delete('q');
      }),
      { scroll: false }
    );
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

  const onSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (isSortValue(e.target.value)) pushSort(e.target.value);
  };

  return (
    <div className='sticky top-0 z-30 border-y border-line-soft bg-cream/95 py-4 backdrop-blur-md'>
      <div className='mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 md:px-8'>
        <div
          role='tablist'
          aria-label='Filter by category'
          className='flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {CATEGORY_FILTERS.map((category) => {
            const on = category === activeCategory;
            return (
              <button
                key={category}
                type='button'
                role='tab'
                aria-selected={on}
                onClick={() => pushCategory(category)}
                className={`rounded-full px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-[background-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-reduce:transition-none ${
                  on ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {category}
              </button>
            );
          })}
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
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              aria-hidden='true'
              className='h-3.5 w-3.5 shrink-0 text-muted'
            >
              <circle cx='11' cy='11' r='8' />
              <path d='M21 21l-4.35-4.35' />
            </svg>
            <label htmlFor='catalog-search' className='sr-only'>
              Search the case
            </label>
            <input
              id='catalog-search'
              type='search'
              value={query}
              onChange={onSearchChange}
              placeholder='Search the case…'
              className='w-44 border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted'
            />
          </form>

          <div className='relative inline-flex items-center'>
            <label htmlFor='catalog-sort' className='sr-only'>
              Sort products
            </label>
            <select
              id='catalog-sort'
              value={activeSort}
              onChange={onSortChange}
              className='appearance-none rounded-full border border-line bg-paper py-2 pr-9 pl-4 text-[13px] font-medium text-ink-soft transition-colors duration-300 hover:border-ink focus:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-cream'
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {`Sort: ${opt.label}`}
                </option>
              ))}
            </select>
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              aria-hidden='true'
              className='pointer-events-none absolute right-3.5 h-2.5 w-2.5 text-ink-soft'
            >
              <polyline points='6 9 12 15 18 9' />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogFilterBar;
