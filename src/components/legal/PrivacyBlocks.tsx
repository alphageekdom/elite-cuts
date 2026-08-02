import CheckIcon from '@/components/ui/icons/CheckIcon';
import XIcon from '@/components/ui/icons/XIcon';

// The three structured blocks the Privacy page uses inside `LegalDocument`
// section bodies. They live here rather than in the page file so the page
// reads as the copy it is — the wording is the point of that file, and these
// are just the shapes it pours into.
//
// Each is rendered inside a section marked `wide`, so they get a wider measure
// than the surrounding prose.
//
// Deliberately one file, against the one-component-per-file convention the
// sibling `checkout/` and `our-story/` folders follow. All three blocks are
// small, single-page, single-consumer, and thematically one thing — the
// structured layouts Privacy's body pours copy into. Splitting them into three
// or four files would add navigation cost without making anything clearer. If a
// second legal page ever reuses one of them, split then.

type ListCardProps = {
  tone: 'keep' | 'never';
  label: string;
  items: string[];
};

/**
 * One half of the collect / never-collect split. The two are deliberately the
 * same shape so they read as a pair a reader can scan across.
 */
function ListCard({ tone, label, items }: ListCardProps) {
  const isKeep = tone === 'keep';
  const Icon = isKeep ? CheckIcon : XIcon;

  return (
    <div className='rounded-2xl border border-line-soft bg-paper px-6 py-6 sm:px-7'>
      <div className='mb-4 flex items-center gap-2.5'>
        <span
          aria-hidden='true'
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
            isKeep ? 'bg-green-soft text-green-deep' : 'bg-red-soft text-oxblood'
          }`}
        >
          <Icon className='h-3 w-3' />
        </span>
        <h3 className='text-[11px] font-semibold uppercase tracking-[0.16em] text-camel-deeper'>
          {label}
        </h3>
      </div>
      <ul className='flex flex-col'>
        {items.map((item) => (
          <li
            key={item}
            className={`border-t border-line-soft py-2.5 text-[14.5px] leading-normal ${
              isKeep ? 'text-ink-soft' : 'text-muted'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DataSplitCards({
  keep,
  never,
}: {
  keep: string[];
  never: string[];
}) {
  return (
    // Two-up only from md. At sm the body column is narrow enough that two
    // columns would wrap most rows onto three lines each.
    <div className='grid gap-5 md:grid-cols-2'>
      <ListCard tone='keep' label='What we store' items={keep} />
      <ListCard tone='never' label='What we never ask for' items={never} />
    </div>
  );
}

export type Vendor = {
  name: string;
  sees: string;
  role: string;
};

/**
 * Deliberately a list, not a table. At the widths this renders in, the three
 * columns only exist above md — and switching a real `<table>` between
 * `display: block` and `display: table-cell` is the classic way to strip the
 * row/column association screen readers rely on. Each row carries its own
 * meaning in its visible text ("Stripe. Test-mode payment flows only. …
 * Payments"), so the column headers are decoration for sighted scanning and
 * are hidden from assistive tech rather than faked.
 */
export function VendorList({ vendors }: { vendors: Vendor[] }) {
  return (
    <div className='overflow-hidden rounded-2xl border border-line-soft bg-paper'>
      <div
        aria-hidden='true'
        className='hidden gap-5 border-b border-line-soft bg-cream-deep/60 px-6 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-camel-deeper md:grid md:grid-cols-[140px_1fr_110px]'
      >
        <span>Service</span>
        <span>What it sees</span>
        <span className='text-right'>Role</span>
      </div>
      <ul>
        {vendors.map((vendor, i) => (
          <li
            key={vendor.name}
            className={`gap-1.5 px-6 py-4 md:grid md:grid-cols-[140px_1fr_110px] md:items-baseline md:gap-5 ${
              i > 0 ? 'border-t border-line-soft' : ''
            }`}
          >
            <span className='block text-[15px] font-semibold text-ink'>
              {vendor.name}
            </span>
            <span className='block text-[14.5px] leading-[1.55] text-ink-soft'>
              {vendor.sees}
            </span>
            <span className='mt-1.5 block text-[11.5px] uppercase tracking-[0.14em] text-camel-deeper md:mt-0 md:text-right'>
              {/* The visual column header is aria-hidden, so without this the
                  role reads as a bare noun trailing a finished sentence —
                  "…no real card is ever charged. Payments." The name and
                  description carry their own meaning; only this one needs
                  the header's context restored. */}
              <span className='sr-only'>Role: </span>
              {vendor.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Choice = {
  title: string;
  body: string;
  where: string;
};

export function ChoiceCards({ choices }: { choices: Choice[] }) {
  return (
    // Three-up only from xl, and one-up below it — never two-up, because an
    // odd count in a two-column grid strands the last card beside an empty
    // cell. The late breakpoint is deliberate: the contents rail appears at lg
    // and takes 260px out of the body column, so a three-column row measured
    // 177px wide and 303px tall there — narrower than it is at the breakpoint
    // below. Full-width cards read better than cramped ones.
    <div className='grid gap-4 xl:grid-cols-3'>
      {choices.map((choice) => (
        <div
          key={choice.title}
          className='flex flex-col rounded-2xl border border-line-soft bg-paper px-6 py-6'
        >
          <h3 className='font-display mb-2.5 text-[21px] font-normal leading-tight text-ink'>
            {choice.title}
          </h3>
          <p className='mb-4 text-[14px] leading-[1.6] text-ink-soft'>
            {choice.body}
          </p>
          <p className='mt-auto text-[11.5px] font-semibold uppercase tracking-[0.14em] text-oxblood'>
            {choice.where}
          </p>
        </div>
      ))}
    </div>
  );
}
