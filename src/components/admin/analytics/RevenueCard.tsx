import { fmtDollarShort, toSvgPath, toSvgArea, dotPositions } from './sections/analytics-utils';
import RangeToggle, { type RangeKey } from './RangeToggle';
import AdminEyebrow from '@/components/admin/AdminEyebrow';

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
  const maxBucket = Math.max(1, ...values, ...prevValues);
  const currentPath = toSvgPath(values, maxBucket);
  const currentArea = toSvgArea(values, maxBucket);
  const prevPath = toSvgPath(prevValues, maxBucket);
  const prevArea = toSvgArea(prevValues, maxBucket);
  const dots = dotPositions(values, maxBucket);

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
    <div className="bg-paper border border-line-soft rounded-sm p-7">
      <div className="flex items-end justify-between mb-6 gap-5">
        <div>
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

      <div className="relative h-[280px]">
        <div className="absolute top-0 bottom-6 left-0 w-[50px] flex flex-col justify-between font-mono text-[10px] text-muted pointer-events-none">
          {yLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <svg
          viewBox="0 0 550 256"
          preserveAspectRatio="none"
          className="absolute inset-0 left-[50px] right-0 bottom-6 top-0 w-[calc(100%-50px)] h-[calc(100%-24px)]"
        >
          <defs>
            <linearGradient id="rev1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B1F1F" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#6B1F1F" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B8895A" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#B8895A" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[56, 112, 168, 224].map((y) => (
            <line key={y} x1="0" y1={y} x2="550" y2={y} stroke="rgba(28,24,20,0.06)" strokeDasharray="2 4" />
          ))}
          {prevArea && <path d={prevArea} fill="url(#rev2)" />}
          {prevPath && <path d={prevPath} fill="none" stroke="#B8895A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />}
          {currentArea && <path d={currentArea} fill="url(#rev1)" />}
          {currentPath && <path d={currentPath} fill="none" stroke="#6B1F1F" strokeWidth="2" />}
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={i === dots.length - 1 ? 5 : 3}
              fill="#FBF7F0"
              stroke="#6B1F1F"
              strokeWidth={i === dots.length - 1 ? 2 : 1.5}
            />
          ))}
        </svg>
        <div className="absolute bottom-0 left-[50px] right-0 flex justify-between font-mono text-[10px] text-muted tracking-[0.04em]">
          {buckets.map((b, i) => (
            <span key={`${b.label}-${i}`}>{b.label}</span>
          ))}
        </div>
      </div>

      <div className="flex gap-6 mt-4.5 pt-4.5 border-t border-line-soft text-[12px] text-muted flex-wrap">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-oxblood" />
          This period · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(revenueTotal)}</strong>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-camel" />
          Previous · <strong className="text-ink font-display font-medium text-sm">{fmtDollarShort(revenuePrevTotal)}</strong>
        </span>
      </div>
    </div>
  );
}
