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
      intro={`What ${shopName} collects, what it does with it, and what it does not.`}
      updatedAt={LAST_UPDATED}
    >
      <LegalSection heading='What we collect'>
        <LegalParagraph>
          When you create an account or place a demo order, we store the
          minimum needed to make the site work — your name, email, hashed
          password, optional phone, optional pickup address, and any cuts you
          save or order. Browsing the site without signing in does not create
          a personal record.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='How it is used'>
        <LegalList
          items={[
            'To run your account — signing you in, showing your saved cuts, and listing your past demo orders.',
            'To send order-related email such as a demo receipt or a pickup-ready note (no marketing emails are sent).',
            'To improve the site — aggregate, anonymous metrics about which pages load slowly or which features get used.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='What we do not do'>
        <LegalParagraph>
          We do not sell your data, share it with advertisers, or use it to
          build a profile across other sites. There is no third-party
          advertising network on this site.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Third parties'>
        <LegalParagraph>
          A few services power the site behind the scenes. Each one only sees
          the data it needs to do its job:
        </LegalParagraph>
        <LegalList
          items={[
            'Stripe handles test-mode payment flows — no real card is ever charged.',
            'MongoDB Atlas hosts the database.',
            'Cloudinary hosts product photography.',
            'Vercel hosts the site and serves the pages you see.',
          ]}
        />
      </LegalSection>

      <LegalSection heading='Cookies'>
        <LegalParagraph>
          The site sets a small number of cookies needed to keep you signed in
          and to remember your cart between page loads. No tracking,
          advertising, or analytics cookies are set.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Your choices'>
        <LegalParagraph>
          You can edit your details, clear your saved cuts, or delete your
          account at any time from your{' '}
          <Link
            href='/profile'
            className='text-oxblood underline-offset-2 hover:underline'
          >
            profile page
          </Link>
          . Deleting your account hides it immediately and erases it
          permanently after thirty days.
        </LegalParagraph>
      </LegalSection>

      <LegalSection heading='Contact'>
        <LegalParagraph>
          For anything privacy-related, email{' '}
          <a
            href={`mailto:${email}`}
            className='text-oxblood underline-offset-2 hover:underline'
          >
            {email}
          </a>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
