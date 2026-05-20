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
    title: 'Privacy Policy',
    description: `What ${shopName} collects, why, and how it is used. Plain language, no surprises.`,
  };
}

export default async function PrivacyPage() {
  const { shopName, email } = await getShopSettings();

  return (
    <LegalPage
      eyebrow='Privacy Policy'
      title='Your data,'
      titleAccent='kept simple.'
      intro={`Plain-English answers for the ${shopName} project — what we collect, what we do with it, and what we deliberately don't.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection heading='What we collect'>
        <LegalParagraph>
          When you create an account or place an order, we store the minimum
          needed to make the site work — your name, email, hashed password,
          optional phone, optional pickup address, and any cuts you save or
          order. Browsing without signing in doesn&apos;t create a personal
          record.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='How it is used'>
        <LegalList
          items={[
            'To run your account — signing you in, showing your saved cuts, and listing past orders.',
            "To send order-related email — a receipt, a pickup-ready note. We don't send marketing email.",
            'To improve the site — aggregate, anonymous metrics about which pages are slow or which features get used.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='What we do not do'>
        <LegalParagraph>
          We don&apos;t sell your data, share it with advertisers, or use it
          to build a profile of you across other sites. There&apos;s no
          third-party advertising network on this site.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Third parties'>
        <LegalParagraph>
          A few services power the site. Each one only sees the data it
          needs:
        </LegalParagraph>
        <LegalList
          items={[
            'Stripe handles test-mode payment flows — no real card is ever charged.',
            'MongoDB Atlas hosts the customer accounts and order records.',
            'Cloudinary hosts the product photography.',
            'Vercel hosts the site itself.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='Cookies'>
        <LegalParagraph>
          The site sets a small number of cookies needed to keep you signed
          in and to remember your cart between page loads. We don&apos;t set
          tracking, advertising, or analytics cookies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Your choices'>
        <LegalParagraph>
          You can edit your details, clear your saved cuts, or delete your
          account at any time from your{' '}
          <Link
            href='/profile'
            className={LEGAL_LINK_CLASS}
          >
            profile page
          </Link>
          . Deleting your account hides it immediately and erases it
          permanently after thirty days.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Contact'>
        <LegalParagraph>
          Privacy questions? Email{' '}
          <a
            href={`mailto:${email}`}
            className={LEGAL_LINK_CLASS}
          >
            {email}
          </a>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
