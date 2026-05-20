import Link from 'next/link';
import SectionLabel from '@/components/ui/SectionLabel';

const NotFoundPage = () => {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-cream px-6 text-center'>
      <SectionLabel className='mb-3 block'>
        404
      </SectionLabel>
      <h1 className='font-display text-[clamp(40px,6vw,72px)] font-normal leading-none tracking-tight text-ink'>
        Page not <em className='text-oxblood'>found.</em>
      </h1>
      <p className='mt-5 max-w-[40ch] text-[15px] leading-relaxed text-ink-soft'>
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className='mt-10 flex flex-wrap items-center justify-center gap-4'>
        <Link
          href='/products'
          className='inline-flex items-center rounded-full bg-ink px-7 py-3 text-sm font-medium tracking-wide text-cream transition-colors hover:bg-oxblood'
        >
          Shop cuts
        </Link>
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

export default NotFoundPage;
