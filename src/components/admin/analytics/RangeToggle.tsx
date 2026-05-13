import Link from 'next/link';

export type RangeKey = '7D' | '30D' | '90D' | '1Y';

const OPTIONS: RangeKey[] = ['7D', '30D', '90D', '1Y'];

type Props = {
  active: RangeKey;
  // basePath is the route the toggle lives on, e.g. "/dashboard/analytics" or
  // "/dashboard". 30D is treated as the default and omits the query param so
  // the canonical URL is the bare path.
  basePath: string;
  // Visual variant: chart-card lives inside a `bg-paper` chart card and uses
  // `bg-cream-deep` for the pill background; standalone uses `bg-paper` with
  // a border for use in page headers or open backgrounds.
  variant?: 'chart-card' | 'standalone';
  className?: string;
};

export default function RangeToggle({ active, basePath, variant = 'chart-card', className = '' }: Props) {
  const wrapClasses =
    variant === 'chart-card'
      ? 'inline-flex bg-cream-deep rounded-full p-0.75'
      : 'inline-flex bg-paper border border-line rounded-full p-[3px]';

  return (
    <div className={`${wrapClasses} ${className}`.trim()}>
      {OPTIONS.map((p) => (
        <Link
          key={p}
          href={p === '30D' ? basePath : `${basePath}?range=${p}`}
          scroll={false}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            active === p ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
          }`}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
