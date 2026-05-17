type Props = {
  active: number;
  workingToday: number;
  offToday: number;
};

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-paper border border-line-soft rounded-[4px] px-5 py-4 transition-transform duration-150 hover:-translate-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="font-display text-[32px] leading-none font-normal tracking-tight text-ink mt-3">
        {value}
      </p>
    </div>
  );
}

export default function StaffSummaryCards({ active, workingToday, offToday }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card label="Active Staff" value={active} />
      <Card label="Working Today" value={workingToday} />
      <Card label="Off Today" value={offToday} />
    </div>
  );
}
