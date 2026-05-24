import { fmtDollarShort } from './sections/analytics-utils';
import RangeToggle, { type RangeKey } from './RangeToggle';
import AdminEyebrow from '@/components/admin/AdminEyebrow';
import { buildSparklinePath } from '@/lib/sparkline';

export type RevenueBucket = { label: string; value: number; prevValue: number };
export type BucketUnit = 'Day' | 'Week' | 'Biweekly' | 'Monthly';

type Props = {
  range: RangeKey;
  buckets: RevenueBucket[];
  bucketUnit: BucketUnit;
  revenueTotal: number;
  revenuePrevTotal: number;
  // Where the toggle links should point — analytics and dashboard each pass
  // their own base path so the same component works on both pages.
  basePath: string;
  // Eyebrow ornament — left as a prop so the dashboard can drop it while
  // analytics keeps its 01 / 02 numbering.
  eyebrow?: string;
};

const SVG_W = 550;
const SVG_H = 256;
const SVG_PAD = 20;

export default function RevenueCard({
  range,
  buckets,
  bucketUnit,
  revenueTotal,
  revenuePrevTotal,
  basePath,
  eyebrow,
}: Props) {
  const values = buckets.map((b) => b.value);
  const prevValues = buckets.map((b) => b.prevValue);
  // Shared max so the two overlaid sparklines stay on the same scale; floor at
  // zero so the y-axis labels run 0 → max linearly, which the legend below
  // reads against.
  const maxBucket = Math.max(1, ...values, ...prevValues);
  const sparkOpts = {
    width: SVG_W,
    height: SVG_H,
    padding: SVG_PAD,
    floor: 'zero' as const,
    max: maxBucket,
  };
  const current = buildSparklinePath(values, sparkOpts);
  const previous = buildSparklinePath(prevValues, sparkOpts);

  const yLabels = [maxBucket, maxBucket * 0.75, maxBucket * 0.5, maxBucket * 0.25, 0].map((v) =>
    fmtDollarShort(v),
  );

  const subtitle =
    bucketUnit === 'Day'
      ? 'Daily totals · this period vs previous'
      : bucketUnit === 'Biweekly'
        ? 'Biweekly totals · this period vs previous'
        : bucketUnit === 'Monthly'
          ? 'Monthly totals · this period vs previous'
          : 'Weekly totals · this period vs previous';

  return (
    <div className="@container bg-paper border border-line-soft rounded-sm p-5 sm:p-7">
      {/* Header layout is driven by a container query, not viewport
          width. The card sits in a 1.7fr column on the dashboard
          (~350px at iPad landscape, even though the viewport is
          1024px+), and in a full-width column on the analytics page
          (~1100px at the same viewport). A viewport-based breakpoint
          can't tell those two cases apart, so the title used to wrap
          onto 3 lines in the dashboard's narrow column even at lg+.
          @md: (≥28rem ≈ 448px of card width) is the threshold where
          the title + RangeToggle reliably fit side-by-side. */}
      <div className="flex flex-col @md:flex-row @md:items-end @md:justify-between gap-4 @md:gap-5 mb-6">
        <div className="min-w-0">
          {eyebrow && (
            <AdminEyebrow size="card" className="mb-1">{eyebrow}</AdminEyebrow>
          )}
          <div className="font-display font-medium text-[22px] tracking-[-0.015em] leading-snug">
            Revenue <em className="italic text-oxblood font-normal">over time</em>
          </div>
          <div className="text-[12px] text-muted mt-1">{subtitle}</div>
        </div>
        <RangeToggle active={range} basePath={basePath} />
      </div>

      <div className="relative h-70">
        <div className="absolute top-0 bottom-6 left-0 w-12.5 flex flex-col justify-between font-mono text-[10px] text-muted pointer-events-none">
          {yLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 left-12.5 right-0 bottom-6 top-0 w-[calc(100%-50px)] h-[calc(100%-24px)]"
        >
          <defs>
            <linearGradient id="rev1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-oxblood)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-oxblood)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-camel)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--color-camel)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[56, 112, 168, 224].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={SVG_W}
              y2={y}
              stroke="var(--color-ink)"
              strokeOpacity="0.06"
              strokeDasharray="2 4"
            />
          ))}
          {previous.area && <path d={previous.area} fill="url(#rev2)" />}
          {previous.line && <path d={previous.line} fill="none" stroke="var(--color-camel)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />}
          {current.area && <path d={current.area} fill="url(#rev1)" />}
          {current.line && <path d={current.line} fill="none" stroke="var(--color-oxblood)" strokeWidth="2" />}
          {current.points.map((p, i) => {
            const isLast = i === current.points.length - 1;
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isLast ? 5 : 3}
                fill="var(--color-paper)"
                stroke="var(--color-oxblood)"
                strokeWidth={isLast ? 2 : 1.5}
              />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-12.5 right-0 flex justify-between font-mono text-[10px] text-muted tracking-[0.04em]">
          {buckets.map((b, i) => (
            <span key={`${b.label}-${i}`}>{b.label}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-6 mt-4.5 pt-4.5 border-t border-line-soft text-[12px] text-muted flex-wrap">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-oxblood" />
          This period · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(revenueTotal)}</strong>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-camel" />
          Previous · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(revenuePrevTotal)}</strong>
        </span>
      </div>
    </div>
  );
}
