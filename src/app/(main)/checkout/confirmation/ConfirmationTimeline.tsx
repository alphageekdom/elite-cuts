export type TimelineStep = {
  // Absent where the shop has never committed to a time. The design filled
  // all four steps with clock times ("3:30 pm cut", "3:50 pm we text you"),
  // but only two moments are recorded anywhere: when the order was placed and
  // the pickup window the customer chose. The rest would have been invented,
  // so the middle step carries no time at all rather than a plausible one.
  time?: string;
  title: string;
  body: string;
  done: boolean;
};

type Props = {
  steps: TimelineStep[];
};

const ConfirmationTimeline = ({ steps }: Props) => (
  <section className='rounded-sm border border-line-soft bg-paper px-6 py-6 sm:px-7 sm:py-7'>
    <h2 className='font-display text-[24px] tracking-tight sm:text-[26px]'>
      What happens <em className='text-oxblood'>next</em>
    </h2>
    <ol className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0'>
      {steps.map((step, i) => (
        <li key={step.title} className='sm:pr-5'>
          <div className='flex items-center gap-0' aria-hidden='true'>
            <span
              className={`h-2.75 w-2.75 shrink-0 rounded-full ${
                step.done ? 'bg-green' : 'border border-line bg-cream'
              }`}
            />
            {i < steps.length - 1 && (
              <span className='hidden h-px flex-1 bg-line sm:block' />
            )}
          </div>
          {/* A non-breaking space holds the line box open so the three titles
              stay on one baseline when only some steps carry a time. Written
              as an escape because the literal character is invisible in a
              diff and a formatter could swap it for a plain space, which
              collapses the box. Hidden from assistive tech on the steps that
              have no time, so it isn't announced as a blank line. */}
          <p
            aria-hidden={step.time ? undefined : true}
            className={`mt-3.5 font-mono text-[12px] tracking-[0.04em] ${
              step.done ? 'text-green' : 'text-muted'
            }`}
          >
            {step.time ?? '\u00A0'}
          </p>
          <p className='mt-1.5 text-[14.5px] leading-snug text-ink'>
            {/* A completed step is otherwise marked only by the filled dot and
                a green time, both of which are colour alone to a screen
                reader — the dot row is decorative. */}
            {step.done && <span className='sr-only'>Done — </span>}
            {step.title}
          </p>
          <p className='mt-1.5 text-[12.5px] leading-relaxed text-muted'>
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  </section>
);

export default ConfirmationTimeline;
