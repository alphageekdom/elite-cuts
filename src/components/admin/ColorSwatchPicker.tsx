'use client';

import { SHIFT_COLORS, type ShiftColor } from '@/lib/shifts/constants';
import { COLOR_SWATCH } from '@/lib/staff/display';

type Props = {
  value: ShiftColor;
  onChange: (next: ShiftColor) => void;
};

// Shared color picker used by the shift drawer and the staff form drawer.
// Each swatch is a labeled button — a11y-friendly focus indicator, label
// underneath, and group-focus-visible so keyboard users see the same opacity
// darken that mouse users get on hover.
export default function ColorSwatchPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-3 flex-wrap">
      {SHIFT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          aria-pressed={value === c}
          className="flex flex-col items-center gap-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-full"
        >
          <span
            className={`w-9 h-9 rounded-full ${COLOR_SWATCH[c]} transition-all ${
              value === c
                ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper'
                : 'opacity-70 group-hover:opacity-100 group-focus-visible:opacity-100'
            }`}
          />
          <span
            className={`text-[10px] tracking-[0.06em] capitalize ${
              value === c ? 'text-ink font-medium' : 'text-muted'
            }`}
          >
            {c}
          </span>
        </button>
      ))}
    </div>
  );
}
