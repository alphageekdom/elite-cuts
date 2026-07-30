'use client';

import { startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Sits below the (admin) layout so a page throw no longer unmounts the whole
// admin shell into the customer-styled root error page — the sidebar and
// topbar stay put and only the content area shows the failure.
const DashboardError = ({ error, reset }: Props) => {
  const router = useRouter();

  // refresh() before reset(): every dashboard page fetches in a server
  // component, and bare reset() would replay the same failed payload without
  // re-asking the server. Same pattern as the root error boundary.
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className='mx-auto mt-10 max-w-xl rounded-2xl border border-line bg-paper px-8 py-10 text-center'>
      <p className='font-mono text-[11px] uppercase tracking-widest text-oxblood'>
        Something went wrong
      </p>
      <h1 className='mt-3 font-display text-3xl text-ink'>
        This page hit a snag.
      </h1>
      <p className='mt-3 text-[15px] leading-relaxed text-ink-soft'>
        The rest of the dashboard is still working — try this page again, or
        head back to the overview.
      </p>
      {error.digest && (
        <p className='mt-3 font-mono text-xs text-ink-soft/70'>
          Reference: {error.digest}
        </p>
      )}
      <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
        <button
          type='button'
          onClick={retry}
          className='inline-flex items-center rounded-full bg-ink px-6 py-2.5 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-oxblood'
        >
          Try again
        </button>
        <Link
          href='/dashboard'
          className='inline-flex items-center rounded-full border border-line px-6 py-2.5 text-sm font-medium tracking-wide text-ink-soft transition-colors hover:border-ink hover:text-ink'
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
};

export default DashboardError;
