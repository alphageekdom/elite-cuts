import type { Metadata } from 'next';
import Link from 'next/link';

import LegalPage from '@/components/legal/LegalPage';
import {
  LEGAL_LINK_CLASS,
  LegalList,
  LegalParagraph,
  LegalSection,
} from '@/components/legal/LegalSection';
import { getShopSettings } from '@/lib/shopSettings';

const LAST_UPDATED = '2026-05-20';

export async function generateMetadata(): Promise<Metadata> {
  const { shopName } = await getShopSettings();
  return {
    title: 'Terms of Service',
    description: `Plain-language terms for using the ${shopName} portfolio storefront.`,
  };
}

export default async function TermsPage() {
  const { shopName } = await getShopSettings();

  return (
    <LegalPage
      eyebrow='Terms of Service'
      title='The fine print,'
      titleAccent='kept short.'
      intro={`Plain-English ground rules for the ${shopName} project — what you can do, what to expect, and what we cannot promise.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection heading='Acceptable use'>
        <LegalParagraph>
          Browse the catalog, create an account, place orders, and explore
          every feature — that&apos;s exactly what the site is here for.
          Don&apos;t try to break it, scrape it at volume, abuse the sign-in
          flows, or use it to host content that isn&apos;t yours.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Your account'>
        <LegalParagraph>
          Your password is yours to keep private. If you sign in through one
          of the shared accounts on the{' '}
          <Link
            href='/demo'
            className={LEGAL_LINK_CLASS}
          >
            demo landing page
          </Link>
          , remember those accounts reset every night — anything you save
          under them goes with the reset.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Orders and payment'>
        <LegalParagraph>
          No real money changes hands on {shopName}. Checkout either records a
          no-charge order on the spot or hands you off to a Stripe test page;
          neither one will touch a real card. Prices, stock, pickup slots,
          and order history are here to show how the shop would work, not to
          sell you a steak.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='What we cannot promise'>
        <LegalList
          items={[
            "The site may go down, change, or retire without warning — it's a personal project, not a service.",
            'Demo data resets nightly, so anything you create as a demo customer will be gone the next morning.',
            'We make no warranty that the site is fit for any particular purpose, and we are not liable for any loss that arises from using it.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='Changes to these terms'>
        <LegalParagraph>
          If this page changes, the date at the top moves with it. The site
          is a portfolio project, so don&apos;t expect surprise updates — but
          standard legal pages say to flag this, and so does this one.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Contact'>
        <LegalParagraph>
          Questions? Reach out through the{' '}
          <Link
            href='/contact'
            className={LEGAL_LINK_CLASS}
          >
            contact page
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
