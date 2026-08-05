import ChevronIcon from '@/components/ui/icons/ChevronIcon';

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
        <ChevronIcon className="w-2.5 h-2.5" direction="up" strokeWidth={3} />
      ) : (
        <ChevronIcon className="w-2.5 h-2.5" direction="down" strokeWidth={3} />
      )}
      {display}
    </span>
  );
}
