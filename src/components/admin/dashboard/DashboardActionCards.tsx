import Link from 'next/link';

// The four questions an admin actually has when they open this page, each one
// answered with a real number and each one a link to where it gets dealt with.
//
// The design's fourth card was "Unassigned — #EC-A5CF has no butcher". Nothing
// records who cuts an order, so it is replaced by "Ready for pickup", which is
// a real status and the same kind of question.

export type ActionTone = 'dark' | 'alert' | 'warn' | 'plain';

export type ActionCard = {
  label: string;
  value: number | string;
  unit: string;
  meta: string;
  href: string;
  tone: ActionTone;
};

const TONE: Record<ActionTone, { card: string; label: string; value: string; meta: string; pip: string }> = {
  dark: {
    card: 'bg-ink border-ink hover:border-camel',
    label: 'text-camel',
    value: 'text-cream',
    meta: 'text-cream/60',
    pip: 'bg-green-bright',
  },
  alert: {
    card: 'bg-oxblood/8 border-oxblood/20 hover:border-oxblood/45',
    label: 'text-oxblood',
    value: 'text-ink',
    meta: 'text-ink-soft',
    pip: 'bg-oxblood',
  },
  warn: {
    card: 'bg-amber-soft border-amber/25 hover:border-amber/50',
    label: 'text-camel-deeper',
    value: 'text-ink',
    meta: 'text-ink-soft',
    pip: 'bg-camel',
  },
  plain: {
    card: 'bg-paper border-line-soft hover:border-line',
    label: 'text-muted',
    value: 'text-ink',
    meta: 'text-ink-soft',
    pip: 'bg-line',
  },
};

export default function DashboardActionCards({ cards }: { cards: ActionCard[] }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const tone = TONE[card.tone];
        return (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-sm border px-5 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oxblood ${tone.card}`}
          >
            <div className="flex items-center justify-between gap-2.5">
              <span
                className={`text-[10px] font-medium uppercase tracking-[0.18em] leading-tight ${tone.label}`}
              >
                {card.label}
              </span>
              <span className={`h-1.75 w-1.75 shrink-0 rounded-full ${tone.pip}`} aria-hidden="true" />
            </div>

            <p className="mt-4 flex items-baseline gap-2">
              <span
                className={`font-display text-[38px] leading-none tracking-tight ${tone.value}`}
              >
                {card.value}
              </span>
              <span className={`text-[13px] ${tone.meta}`}>{card.unit}</span>
            </p>

            <p className={`mt-3 text-[12.5px] leading-snug ${tone.meta}`}>{card.meta}</p>
          </Link>
        );
      })}
    </div>
  );
}
