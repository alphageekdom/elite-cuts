'use client';

import Link from 'next/link';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage = ({ reset }: Props) => {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center'>
      <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
        Something went wrong
      </p>
      <h1 className='font-display text-[clamp(40px,6vw,72px)] font-normal leading-none tracking-tight text-ink'>
        Unexpected <em className='text-oxblood'>error.</em>
      </h1>
      <p className='mt-5 max-w-[40ch] text-[15px] leading-relaxed text-ink-soft'>
        We hit a snag on our end. Give it another try — if it keeps happening,
        contact us and we&apos;ll sort it out.
      </p>
      <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
        <button
          type='button'
          onClick={reset}
          className='inline-flex items-center rounded-full bg-ink px-7 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-oxblood'
        >
          Try again
        </button>
        <Link
          href='/'
          className='inline-flex items-center rounded-full border border-line px-7 py-3 text-sm font-medium tracking-wide text-ink-soft transition-colors hover:border-ink hover:text-ink'
        >
          Go home
        </Link>
      </div>
    </div>
  );
};

export default ErrorPage;
