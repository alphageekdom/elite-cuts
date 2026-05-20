type DemoPillProps = {
  title?: string;
  className?: string;
};

// Static "Demo" badge rendered inline next to a name/identifier. Used by the
// admin orders and customers tables to mark rows that belong to the seeded
// demo accounts. Not interactive — the navbar's clickable demo chip lives in
// `DemoModeChip.tsx` and uses the same amber palette but adds a tooltip.
export default function DemoPill({ title, className = '' }: DemoPillProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium tracking-widest uppercase text-amber-900 border border-amber-200 ${className}`}
    >
      Demo
    </span>
  );
}
