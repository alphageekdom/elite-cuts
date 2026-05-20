import type { Metadata } from 'next';
import Link from 'next/link';

import LegalPage from '@/components/legal/LegalPage';
import {
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
      intro={`How using ${shopName} works — what you can do, what we ask, and what we cannot promise.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection heading='Acceptable use'>
        <LegalParagraph>
          You are welcome to browse the catalog, create an account, place demo
          orders, and explore every feature. Please do not attempt to break the
          site, scrape it at volume, abuse the auth flows, or use it to host or
          distribute content that is not yours.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Your account'>
        <LegalParagraph>
          When you register, you are responsible for keeping your password
          private. If you sign in through the demo accounts on the{' '}
          <Link
            href='/demo'
            className='text-oxblood underline underline-offset-4 decoration-oxblood/40 hover:decoration-oxblood'
          >
            demo landing page
          </Link>
          , bear in mind those accounts are shared and their data resets every
          night.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Orders and payment'>
        <LegalParagraph>
          No real transactions happen on {shopName}. The checkout flow either
          completes a no-charge demo order or hands off to a Stripe test page —
          neither will charge a card. Prices, stock, pickup slots, and order
          history are all illustrative.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='What we cannot promise'>
        <LegalList
          items={[
            'The site may go down, change, or be retired without warning — it is a personal project, not a service.',
            'Demo data resets nightly, so anything you create as a demo customer will be gone the next morning.',
            'We make no warranty that the site is fit for any particular purpose, and we are not liable for any loss that arises from using it.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='Changes to these terms'>
        <LegalParagraph>
          We may update this page at any time. The date at the top reflects the
          most recent change. Continued use of the site after a change means
          you accept the updated terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Contact'>
        <LegalParagraph>
          Questions about this page can go to the address on the{' '}
          <Link
            href='/contact'
            className='text-oxblood underline underline-offset-4 decoration-oxblood/40 hover:decoration-oxblood'
          >
            contact page
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
