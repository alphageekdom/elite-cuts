'use client';

import { startTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SectionLabel from '@/components/ui/SectionLabel';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ErrorPage = ({ error, reset }: Props) => {
  const router = useRouter();

  // Bare reset() only re-renders the client tree from the same failed RSC
  // payload, so for errors thrown in server components — which is nearly
  // every page here, they all fetch server-side — "Try again" would show the
  // same error instantly without ever re-asking the server. refresh() inside
  // the same transition re-fetches the payload first (the pattern the Next
  // docs prescribe for recovering from server errors).
  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center'>
      <SectionLabel className='mb-3 block'>
        Something went wrong
      </SectionLabel>
      <h1 className='font-display text-[clamp(40px,6vw,72px)] font-normal leading-none tracking-tight text-ink'>
        Unexpected <em className='text-oxblood'>error.</em>
      </h1>
      <p className='mt-5 max-w-[40ch] text-[15px] leading-relaxed text-ink-soft'>
        We hit a snag on our end. Give it another try — if it keeps happening,{' '}
        <Link href='/contact' className='underline underline-offset-2 hover:text-ink'>
          contact us
        </Link>{' '}
        and we&apos;ll sort it out.
      </p>
      {error.digest && (
        <p className='mt-3 font-mono text-xs text-ink-soft/70'>
          Reference: {error.digest}
        </p>
      )}
      <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
        <button
          type='button'
          onClick={retry}
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
