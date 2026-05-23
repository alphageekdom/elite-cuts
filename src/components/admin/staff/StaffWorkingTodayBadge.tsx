type Props = {
  workingToday: boolean;
  shift: string | null;
  // `inline` lays the shift range on the same line ("Working today · 8 AM – 12 PM"),
  // used by the mobile card and the profile modal. `stacked` puts the range
  // on its own mono line under the badge, used by the desktop table row.
  layout?: 'inline' | 'stacked';
};

// Shared green-dot + 'Working today' (or muted 'Off today') treatment used
// by the staff desktop table row, the mobile card, and the profile modal.
// Before this consolidation each surface hand-rolled its own slightly
// different sizing chain (text-[11px] vs text-[12px], different gaps).
export default function StaffWorkingTodayBadge({ workingToday, shift, layout = 'stacked' }: Props) {
  if (!workingToday) {
    return (
      <span className="font-mono text-[11px] text-muted tracking-[0.04em] uppercase">
        Off today
      </span>
    );
  }

  if (layout === 'inline') {
    return (
      <span className="text-green font-medium text-[11px] tracking-[0.04em]">
        Working today{shift ? ` · ${shift}` : ''}
      </span>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.04em] text-green">
        <span className="w-1.5 h-1.5 rounded-full bg-green" aria-hidden="true" />
        Working today
      </span>
      {shift && (
        <span className="font-mono text-[11px] text-muted tracking-[0.04em] mt-0.5">
          {shift}
        </span>
      )}
    </div>
  );
}
