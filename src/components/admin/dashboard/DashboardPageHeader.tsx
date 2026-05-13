type Props = {
  name: string;
};

export default function DashboardPageHeader({ name }: Props) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className='mb-8 md:mb-10'>
      <p className='font-display text-camel mb-2 text-sm italic'>
        Welcome back, {name}
      </p>
      <h1 className='font-display mb-1.5 text-[clamp(40px,4.5vw,56px)] leading-none font-normal tracking-tight'>
        This month&apos;s{' '}
        <em className='text-oxblood font-normal italic'>counter.</em>
      </h1>
      <p className='text-muted text-sm tracking-[0.02em]'>
        {today}
        <span className='mx-2'>·</span>
        Here&apos;s how the shop is running.
      </p>
    </div>
  );
}
