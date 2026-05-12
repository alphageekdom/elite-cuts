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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 md:mb-10 gap-4 sm:gap-8">
      <div>
        <p className="font-display italic text-sm text-camel mb-2">
          Welcome back, {name}
        </p>
        <h1 className="font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-none tracking-tight mb-1.5">
          This month&apos;s{' '}
          <em className="italic text-oxblood font-normal">counter.</em>
        </h1>
        <p className="text-muted text-sm tracking-[0.02em]">
          {today} · Here&apos;s how the shop is running.
        </p>
      </div>

      <span className="bg-paper border border-line rounded-full px-4.5 py-2.5 text-[13px] text-ink-soft inline-flex items-center gap-2.5 shrink-0">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Last 30 days
      </span>
    </div>
  );
}
