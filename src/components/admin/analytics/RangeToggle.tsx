import Link from 'next/link';
import type { RangeKey } from '@/lib/admin/range-buckets';

export type { RangeKey };

const OPTIONS = ['7D', '30D', '90D', '1Y'] satisfies readonly RangeKey[];

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
  // Extra query params to preserve when navigating between ranges. Used by
  // the orders dashboard to keep `?includeDemo=true` alive when the admin
  // toggles range while demo activity is included; other surfaces don't
  // need it and pass nothing.
  extraParams?: Record<string, string>;
  className?: string;
};

export default function RangeToggle({
  active,
  basePath,
  variant = 'chart-card',
  extraParams,
  className = '',
}: Props) {
  const wrapClasses =
    variant === 'chart-card'
      ? 'inline-flex bg-cream-deep rounded-full p-0.75'
      : 'inline-flex bg-paper border border-line rounded-full p-0.75';

  const buildHref = (range: RangeKey): string => {
    const params = new URLSearchParams(extraParams);

    params.delete('range');

    if (range !== '30D') params.set('range', range);

    const qs = params.toString();

    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className={`${wrapClasses} ${className}`.trim()}>
      {OPTIONS.map((range) => {
        const isActive = active === range;

        return (
          <Link
            key={range}
            href={buildHref(range)}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              isActive ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {range}
          </Link>
        );
      })}
    </div>
  );
}
