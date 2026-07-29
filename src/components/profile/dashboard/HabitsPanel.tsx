import type { Habit } from '@/lib/profile/dashboard';

/**
 * Three facts derived from order history.
 *
 * The design listed a fourth — "Usual pickup — Tue, late afternoon". Older
 * orders store a prose slot label and newer ones a datetime, so a weekday
 * can't be recovered across mixed history; the stat is absent rather than
 * guessed. See `buildHabits`.
 */
export default function HabitsPanel({ habits }: { habits: Habit[] }) {
  if (habits.length === 0) return null;

  return (
    <div className="rounded border border-line-soft bg-paper p-6">
      <h2 className="text-[11px] tracking-[0.18em] uppercase text-camel-deep">
        Your habits
      </h2>
      <dl className="mt-4 flex flex-col gap-3.5">
        {habits.map((habit) => (
          <div
            key={habit.label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="text-[13.5px] text-ink-soft">{habit.label}</dt>
            <dd className="min-w-0 truncate text-right font-display text-[19px] tracking-tight">
              {habit.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
