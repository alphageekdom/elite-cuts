export default function ChangePill({
  val,
  suffix = '%',
  invert = false,
}: {
  val: number;
  suffix?: string;
  invert?: boolean;
}) {
  const isUp = invert ? val < 0 : val >= 0;
  const display = `${val >= 0 ? '+' : ''}${val.toFixed(1)}${suffix}`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium text-[11px] tracking-[0.02em] font-mono ${
        isUp ? 'bg-green-soft text-green-deep' : 'bg-red-soft text-oxblood'
      }`}
    >
      {isUp ? (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      ) : (
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      {display}
    </span>
  );
}
