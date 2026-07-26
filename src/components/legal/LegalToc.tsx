'use client';

import { useSyncExternalStore } from 'react';

export type LegalTocItem = {
  id: string;
  num: string;
  title: string;
};

// Matches the sections' `scroll-mt-24`, so the highlight flips at the same line
// an anchor jump lands on. If that utility changes, change this with it.
const TRIGGER_OFFSET = 96;

// Scroll position is external state, read through the store API rather than
// mirrored into a state variable from an effect — the same approach the cart
// timer and sign-in cool-down use. The snapshot is a plain string, so React
// bails out of re-rendering on the vast majority of scroll events, when the
// active section hasn't actually changed.
function subscribe(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true });
  window.addEventListener('resize', onStoreChange, { passive: true });
  return () => {
    window.removeEventListener('scroll', onStoreChange);
    window.removeEventListener('resize', onStoreChange);
  };
}

export default function LegalToc({ items }: { items: LegalTocItem[] }) {
  const firstId = items[0]?.id ?? '';

  // Plain closures, deliberately unmemoized: `useSyncExternalStore` only
  // resubscribes when `subscribe` changes (module-level here, so never), and
  // its only contract for `getSnapshot` is that consecutive calls return
  // `Object.is`-equal values while the store hasn't changed — which fresh but
  // equal strings satisfy.
  const getSnapshot = () => {
    // At the very bottom of the page the final section may never cross the
    // trigger line — a short last section on a page that ends right after it
    // simply cannot scroll any higher. Claim it explicitly, or the highlight
    // sticks on the second-to-last heading for the whole end of the document.
    //
    // Gated on the document actually being scrollable. Without that check the
    // condition is trivially true whenever the page fits the viewport, which
    // would pin the highlight to the *last* section permanently — and it also
    // fires for a frame during load, before layout settles, which flashed the
    // wrong item on arrival.
    const scrollable =
      document.documentElement.scrollHeight > window.innerHeight + 4;
    const atBottom =
      scrollable &&
      window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
    if (atBottom) return items[items.length - 1]?.id ?? '';

    let current = firstId;
    for (const { id } of items) {
      const top = document.getElementById(id)?.getBoundingClientRect().top;
      if (top !== undefined && top <= TRIGGER_OFFSET + 1) current = id;
    }
    return current;
  };

  const activeId = useSyncExternalStore(subscribe, getSnapshot, () => firstId);

  return (
    <nav aria-labelledby='legal-toc-label'>
      {/* The visible text IS the accessible name — labelledby, not a parallel
          aria-label, so the two can't drift and the landmark isn't announced
          twice. */}
      <p
        id='legal-toc-label'
        className='mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'
      >
        On this page
      </p>
      <ul className='flex flex-col'>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={`flex items-baseline gap-2 border-l-2 py-2.5 pl-3 text-[14px] transition-colors duration-200 motion-reduce:transition-none ${
                  isActive
                    ? 'border-oxblood font-semibold text-ink'
                    : 'border-line text-muted hover:border-camel-deeper hover:text-ink-soft'
                }`}
              >
                <span
                  aria-hidden='true'
                  className='font-display w-5 shrink-0 text-[13px] text-camel-deeper'
                >
                  {item.num}
                </span>
                <span className='flex-1'>{item.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {/* Deliberately no live region announcing the active section: it would
          fire on every scroll, and `aria-current` on the link already carries
          the state for anyone who navigates into the list. */}
    </nav>
  );
}
