import Link from 'next/link';

import { FOCUS_RING } from '@/lib/styles';
import Accordion, { type AccordionItem } from '@/components/ui/Accordion';
import Reveal from '@/components/ui/Reveal';

// The read-only question is the one that earns its place here: the owner door
// writes almost everywhere, and the single exception is better stated up front
// than discovered as a 403 halfway through the order queue.
const FAQS: AccordionItem[] = [
  {
    q: 'Do I need an account?',
    a: 'No. Both doors open straight into a working session — no email, no password, no card. Picking a door signs you in as a seeded demo account and drops you where that account belongs.',
  },
  {
    q: 'Is anything read-only?',
    a: 'The order queue. Marking an order fulfilled awards reward points to the customer who placed it, and that reaches past the demo’s own data into records the overnight reset does not own — so orders stay read-only for now. You can still open any order, read it end to end, and export the list. Everything else on the owner side genuinely writes.',
  },
  {
    q: 'Is my activity private?',
    a: 'No. Both doors share one shop, so anything you add or edit may be visible to anyone else trying the demo at the same time. Don’t type anything you wouldn’t post publicly.',
  },
  {
    q: 'Will I be charged, or will meat turn up?',
    a: 'Neither. Checkout runs the whole way through and hands you a receipt, but no card is charged and no order reaches a real queue.',
  },
  {
    q: 'What happens to the changes I make?',
    a: 'They stick for as long as you’re here, then go back overnight. The catalog and shop settings return to their snapshot, and the demo shopper’s account — cart, orders, reviews, saved cuts, saved cards, addresses, points — is cleared and re-seeded to the same starting state you found it in. Delete a cut, break a price, spend the points; it’ll all be back tomorrow.',
  },
  {
    q: 'Is this a real butcher shop?',
    a: 'No — EliteCuts is a portfolio project. The shop, the staff, and the partner farms are written; the software is real, and this demo is the honest way to look at it.',
  },
];

export default function DemoFaq() {
  return (
    <section className='bg-cream px-4 py-20 sm:px-8 sm:py-24 lg:px-16'>
      <div className='mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16'>
        <Reveal>
          <div className='lg:sticky lg:top-28'>
            <div className='text-camel-deep mb-5 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
              <span aria-hidden className='bg-camel h-px w-7' />
              Before you go in
            </div>
            <h2 className='font-display mb-5 text-[clamp(32px,4vw,46px)] leading-[1.05] font-normal tracking-tight'>
              Fair <em className='text-oxblood italic'>questions.</em>
            </h2>
            <p className='text-ink-soft mb-7 max-w-[36ch] text-[15.5px] leading-relaxed'>
              The demo is meant to be poked at. Break what you can — it rebuilds
              itself overnight.
            </p>
            <Link
              href='/contact'
              className={`border-line text-ink-soft hover:border-ink/40 hover:text-ink inline-flex items-center gap-2 rounded-full border px-6 py-3 text-[14px] font-medium transition-colors ${FOCUS_RING}`}
            >
              Ask us anything
            </Link>
          </div>
        </Reveal>

        <Reveal delayMs={80}>
          <Accordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}
