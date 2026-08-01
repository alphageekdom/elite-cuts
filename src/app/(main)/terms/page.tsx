import type { Metadata } from 'next';
import Link from 'next/link';

import LegalDocument, {
  LegalList,
  LegalParagraph,
  type LegalSection,
} from '@/components/legal/LegalDocument';
import { LEGAL_LINK_CLASS } from '@/components/legal/legalStyles';
import { getShopSettings } from '@/lib/shop-settings/queries';

// Bumped with this redesign. The "Changes to these terms" section below
// promises this date moves when the page does, and this pass rewrote the
// summaries, split the prose, and added the shared-demo-account disclosure —
// so leaving it at the previous date would make the page contradict itself.
const LAST_UPDATED = '2026-07-25';

export async function generateMetadata(): Promise<Metadata> {
  const { shopName } = await getShopSettings();
  return {
    title: 'Terms of Service',
    description: `Plain-language terms for using the ${shopName} portfolio storefront.`,
  };
}

export default async function TermsPage() {
  const { shopName, email } = await getShopSettings();

  const sections: LegalSection[] = [
    {
      id: 'use',
      title: 'Acceptable use',
      // "Abuse", not "break" — the demo page explicitly invites breaking
      // things ("Break what you like."), and the reset makes that safe. What
      // the body actually forbids is abuse: scraping, sign-in hammering,
      // hosting others' content.
      summary: "Use it like a real shop. Just don't abuse it.",
      body: (
        <>
          <LegalParagraph>
            Browse the catalog, create an account, place orders, and explore
            every feature — that&apos;s exactly what the site is here for.
          </LegalParagraph>
          <LegalParagraph>
            Please don&apos;t scrape it at volume, abuse the sign-in flows, or
            use it to host content that isn&apos;t yours.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'account',
      title: 'Your account',
      summary: 'Your password is yours. Demo accounts are shared and temporary.',
      body: (
        <>
          <LegalParagraph>
            Keep your own password private — it&apos;s the only thing separating
            your order history from anyone else&apos;s.
          </LegalParagraph>
          {/* The sharing half is the point of this paragraph, and it covers
              both doors. The demo signs every visitor into the *same* two
              seeded accounts, so concurrent visitors see each other's carts —
              and a demo admin's catalog edits show on the live storefront
              until the nightly restore puts them back. "Anything you save"
              alone read customer-only and missed that. */}
          <LegalParagraph>
            If you sign in through one of the shared accounts on the{' '}
            <Link href='/demo' className={LEGAL_LINK_CLASS}>
              demo page
            </Link>{' '}
            instead, remember everyone trying the site uses those same two
            accounts. Anything you do under them — orders you place as the
            customer, changes you make as the admin — may be seen by other
            visitors and goes back with the nightly reset.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'orders',
      title: 'Orders and payment',
      summary: 'Nothing is charged — every checkout is a dry run.',
      body: (
        <>
          <LegalParagraph>
            No real money changes hands on {shopName}. Checkout either records a
            no-charge order on the spot or hands you to a test payment page —
            neither one touches a real card.
          </LegalParagraph>
          <LegalParagraph>
            Prices, stock levels, pickup slots, and order history all exist to
            show how the shop would work, not to sell you a steak.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'promises',
      title: 'What we cannot promise',
      summary: "It's a personal project, so treat it as one.",
      body: (
        <LegalList
          items={[
            "The site may go down, change, or retire without warning — it's a personal project, not a service.",
            // Both doors, not just the customer one: the nightly job restores
            // the catalog as well, so an admin demo's edits go the same way.
            // Leads with the consequence rather than restating the pill above.
            'Anything you create through either demo account is gone the next morning — the reset runs every night.',
            "We make no warranty that the site is fit for any particular purpose, and we aren't liable for any loss arising from using it.",
          ]}
        />
      ),
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      summary: 'If this page changes, the date at the top moves with it.',
      // The date-moves rule has to live in the body, not just the summary —
      // summaries are the decorative layer, and this sentence is the page's
      // actual commitment (it's also why LAST_UPDATED above must move with any
      // substantive edit).
      body: (
        <LegalParagraph>
          The site is a portfolio project, so don&apos;t expect surprise
          updates. But if these terms do change, the date at the top moves with
          them — no other notice goes out.
        </LegalParagraph>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      summary: "Ask us anything — we'd rather answer than have you guess.",
      body: (
        <LegalParagraph>
          Questions about any of the above go through the{' '}
          <Link href='/contact' className={LEGAL_LINK_CLASS}>
            contact page
          </Link>
          , or straight to{' '}
          <a href={`mailto:${email}`} className={LEGAL_LINK_CLASS}>
            {email}
          </a>
          . There&apos;s no legal department on the other end, just us.
        </LegalParagraph>
      ),
    },
  ];

  return (
    <LegalDocument
      eyebrow='Terms of Service'
      title='The fine print,'
      titleAccent='kept short.'
      updatedAt={LAST_UPDATED}
      // No "reading time" row. It would have to be either hardcoded — and so
      // wrong the first time a section is edited — or derived by counting words
      // out of JSX, which is not worth the machinery for a badge. The headline
      // and the visible length of the page already make the point.
      meta={[{ label: 'Status', value: 'Portfolio project' }]}
      notice={{
        eyebrow: 'Read this first',
        heading: "This shop isn't",
        headingAccent: 'real.',
        // "Filled", not "processed": the demo records orders and walks them
        // through statuses — a visitor watching one reach "ready for pickup"
        // has just seen an order processed by any commerce reading of the
        // word. What never happens is the physical half.
        body: `${shopName} is a portfolio project, not a storefront. No order is ever filled, no money changes hands, and no meat is ever cut. The terms below are a plain-language placeholder so this link goes somewhere honest — they are not a real legal agreement.`,
        // No clock time here. The reset cron runs at 08:00 UTC, which for a
        // shop configured America/Los_Angeles is midnight PST in winter and
        // 1am PDT in summer — so naming a local hour is wrong for half the
        // year. "Nightly" is true year-round. (The 3am/4am figure this comment
        // used to give is Eastern, which is not where the shop is.)
        pills: [
          'No card is ever charged',
          'No order reaches a real counter',
          'Demo data resets nightly',
        ],
      }}
      withContents
      sections={sections}
      closing={{
        heading: 'Still have a question?',
        body: (
          <>
            Ask directly — or read the{' '}
            <Link href='/privacy' className={LEGAL_LINK_CLASS}>
              Privacy Policy
            </Link>{' '}
            for how the little data this site holds is handled.
          </>
        ),
        ctaHref: '/contact',
        ctaLabel: 'Contact us',
      }}
    />
  );
}
