import type { Metadata } from 'next';
import Link from 'next/link';

import LegalDocument, {
  LegalList,
  LegalParagraph,
  type LegalSection,
} from '@/components/legal/LegalDocument';
import {
  ChoiceCards,
  DataSplitCards,
  VendorList,
} from '@/components/legal/PrivacyBlocks';
import { LEGAL_LINK_CLASS } from '@/components/legal/legalStyles';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  DORMANCY_FOLLOWUP_DAYS,
} from '@/lib/auth/account-deletion-constants';
import { getShopSettings } from '@/lib/shop-settings/queries';

// Bumped with this redesign, and this one is not cosmetic. The previous
// version of this page told readers four things that were not true: that
// order email is sent (no mail service is connected at all), that usage
// metrics are collected (no analytics package is installed), that the cart
// rides in a cookie (it's local storage), and that deleting an account erases
// it permanently (orders keep your name, email and phone; reviews and messages
// keep your name; an audit row keeps your email). The dormancy sweep, which
// deletes accounts for inactivity, was disclosed nowhere. All of that is
// corrected below.
const LAST_UPDATED = '2026-07-25';

export async function generateMetadata(): Promise<Metadata> {
  const { shopName } = await getShopSettings();
  return {
    title: 'Privacy Policy',
    description: `What ${shopName} stores, what it never asks for, and exactly what closing your account leaves behind.`,
  };
}

export default async function PrivacyPage() {
  const { shopName, email, dormancyWarningMonths } = await getShopSettings();

  // 0 means the dormancy scan is switched off entirely, in which case there is
  // nothing to disclose and the paragraph must not render — an "if you don't
  // sign in for 0 months" sentence would be worse than saying nothing.
  const dormancyEnabled = dormancyWarningMonths > 0;

  const sections: LegalSection[] = [
    {
      id: 'collect',
      title: 'What we collect',
      summary:
        'The minimum to run an account — and browsing signed out stays anonymous.',
      wide: true,
      body: (
        <>
          <LegalParagraph>
            If you never sign in, we never build a record of you. Once you do
            have an account, this is the whole list — and the list of things we
            deliberately never ask for.
          </LegalParagraph>
          <DataSplitCards
            keep={[
              'Your name and email address',
              'A hashed password — never the original',
              'Phone number and pickup address, if you add them',
              'Cuts you save, orders you place, and what’s in your cart',
              'Your rewards balance and the points history behind it',
              'Reviews and messages you write, under your name',
              'Saved cards — the brand, last four digits and expiry only',
              // `stripeCustomerId` on the User doc — minted on first checkout
              // through Stripe (real mode only; the stub path never sets it).
              'An id linking your account to Stripe, created the first time you check out through it',
              'When you were last active, and any note shop staff add to your account',
            ]}
            never={[
              'Your full card number — Stripe handles that end',
              'Your date of birth',
              'A log of your IP address or your location',
              'Anything about other sites you visit',
              'Advertising or social identifiers',
              'Anything we don’t actively need',
            ]}
          />
          {/* The IP line above says "a log of" for a reason: the address is
              read on sign-in and sign-up to rate-limit them. Claiming we never
              see it would be false, so the nuance is stated rather than
              glossed. */}
          <LegalParagraph>
            One honest footnote on that last card: your IP address is read for a
            moment on the handful of actions worth throttling — signing in,
            registering, changing a password, checking out, applying a promo
            code, and posting a review or message — so the site can slow down
            repeated attempts. It&apos;s counted in memory and never written
            down. But it isn&apos;t invisible to us either, and as with any
            site, your requests reach our host&apos;s logs.
          </LegalParagraph>
          {/* The single most privacy-relevant fact about how most people
              actually use this site, and it was missing. The Terms cover the
              sharing; what belongs here is the advice that follows from it. */}
          <LegalParagraph>
            And if you&apos;re exploring through the{' '}
            <Link href='/demo' className={LEGAL_LINK_CLASS}>
              demo
            </Link>
            , one thing to know: those accounts are shared by everyone trying
            the site. Anything you type into one — a delivery address at
            checkout, a note on an order — is visible to the next visitor until
            the nightly reset clears it. Use made-up details there.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'used',
      title: 'How it’s used',
      summary: 'Two purposes. There isn’t a third.',
      body: (
        <>
          <LegalList
            items={[
              'To run your account — signing you in, showing your saved cuts and past orders, and keeping your rewards balance straight.',
              'To run the counter — staff see your order so they can prepare it, and your messages so they can answer them.',
            ]}
          />
          {/* The previous version of this page listed a third purpose:
              sending order email. No mail service is connected to this project
              at all, so that was never happening. Stated plainly rather than
              quietly dropped, because a reader who remembers the old wording
              deserves to know which way it was wrong.
              The by-hand caveat is not padding: the admin message drawer and
              the receipt toolbar both carry `mailto:` buttons addressed to the
              customer. Nothing is sent by the site, but a person can still
              write to you, and "we don't send email" alone would read as a
              promise never to appear in your inbox. */}
          <LegalParagraph>
            The site doesn&apos;t send email. There&apos;s no mailing list, no
            newsletter, and nothing automated — no mail service is connected to
            it at all, so your order updates live in your order history rather
            than your inbox. Staff can still write to you by hand from their own
            mail account: a reply if you message the shop, or a copy of your
            receipt if you ask for one.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'never',
      title: 'What we don’t do',
      summary: 'No selling, no sharing, no profile of you anywhere.',
      body: (
        <>
          <LegalParagraph>
            We don&apos;t sell your data, hand it to advertisers, or use it to
            build a picture of you across other sites. There is no third-party
            advertising network anywhere on {shopName}, and no plan to add one.
          </LegalParagraph>
          <LegalParagraph>
            We also don&apos;t measure you. The site carries no analytics
            script — nothing counts your page views, times how long you stay, or
            records which features you use. The sales figures on the shop&apos;s
            own dashboard are built from orders, not from watching you browse.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'vendors',
      title: 'Third parties',
      summary: 'Four services power the site. Each one sees only what it needs.',
      wide: true,
      body: (
        <VendorList
          vendors={[
            {
              name: 'Stripe',
              sees: 'Test-mode payment flows only — no real card is ever charged.',
              role: 'Payments',
            },
            {
              name: 'MongoDB Atlas',
              sees: 'Your account record, orders, reviews and messages.',
              role: 'Database',
            },
            {
              name: 'Cloudinary',
              sees: 'Product photography. No customer data.',
              role: 'Images',
            },
            {
              // Honest about what hosting inherently sees. The old copy
              // claimed "aggregate performance metrics", which implied a
              // measurement product we don't run.
              name: 'Vercel',
              sees: 'Requests to the site, which means your IP address reaches their logs the way it would with any host.',
              role: 'Hosting',
            },
          ]}
        />
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies and local storage',
      summary: 'Sign-in needs cookies. Your cart never did.',
      body: (
        <>
          <LegalParagraph>
            Signing in sets cookies that keep you signed in and protect the
            sign-in form itself. Those are the only cookies this site sets. We
            set no tracking, advertising, or analytics cookies — which is why
            you have never seen a cookie banner here.
          </LegalParagraph>
          {/* Corrects a specific false claim: the previous page said a cookie
              remembered the cart. It doesn't, and never did. */}
          <LegalParagraph>
            Your cart isn&apos;t a cookie. Before you sign in it sits in your own
            browser&apos;s local storage and never leaves your device; once you
            sign in it moves to your account so it follows you between devices.
            A couple of small preferences live in that same browser storage —
            how long your cart has been open, and which table columns an admin
            has hidden.
          </LegalParagraph>
          <LegalParagraph>
            Clearing your browser data clears all of it.
          </LegalParagraph>
        </>
      ),
    },
    {
      id: 'choices',
      title: 'Your choices',
      summary:
        'Edit or close your account yourself — and here’s exactly what closing it leaves behind.',
      wide: true,
      body: (
        <>
          <ChoiceCards
            choices={[
              {
                title: 'Edit anything',
                body: 'Your name, email, phone, pickup addresses and saved cards are all yours to change, and any saved cut can be unsaved.',
                where: 'Profile page',
              },
              {
                title: 'Close your account',
                body: `Hidden from the site straight away, then erased ${ACCOUNT_DELETION_GRACE_DAYS} days later. No exit survey, no retention offer.`,
                where: 'Profile → Delete',
              },
              {
                title: 'Change your mind',
                body: `Sign back in during those ${ACCOUNT_DELETION_GRACE_DAYS} days and the deletion is cancelled — your account comes back untouched.`,
                where: 'Any sign-in',
              },
            ]}
          />
          {/* The section this page most needed and did not have. "Erased
              permanently" was the old wording, and it was not true.
              Two later corrections, both from the scheduled-jobs audit: this
              said "one line" when the audit trail is several entries kept
              indefinitely, and it said "everything else goes" while the
              delivery address and any order note stayed on past orders. The
              address is now actually removed, so the claim is true and the
              list names it. */}
          <LegalParagraph>
            Deleting an account isn&apos;t a clean wipe, and it&apos;s worth
            being straight about why. Past orders stay on the shop&apos;s books
            with the name, email and phone that were on them, because a sales
            record belongs to the shop as much as to you. Reviews and messages
            you wrote stay published under your name, detached from any account.
            And a short audit record of the deletion is kept indefinitely so the
            action can be accounted for afterwards — each entry carries your
            email, and where an admin deleted the account rather than you, the
            reason they typed is kept on it too.
          </LegalParagraph>
          <LegalParagraph>
            Everything else goes: the account itself, your cart, your saved
            cards, your saved cuts, your rewards balance and points history,
            your notifications, the record of which reviews you marked helpful,
            and the delivery address and any note you left on an order.
          </LegalParagraph>
          {dormancyEnabled && (
            <LegalParagraph>
              One thing you don&apos;t have to do anything to trigger: if you
              don&apos;t sign in for {dormancyWarningMonths}{' '}
              months, the account is flagged as dormant. If it&apos;s still
              untouched{' '}
              {DORMANCY_FOLLOWUP_DAYS} days after that, it enters the same
              deletion process described above, and is erased{' '}
              {ACCOUNT_DELETION_GRACE_DAYS} days later. Signing in — or placing
              an order — at any point along the way clears the flag and stops
              the clock.
            </LegalParagraph>
          )}
        </>
      ),
    },
  ];

  return (
    <LegalDocument
      eyebrow='Privacy Policy'
      title='Your data,'
      titleAccent='kept simple.'
      updatedAt={LAST_UPDATED}
      // No "reading time" row, for the same reason Terms doesn't carry one:
      // hardcoding it goes stale the first time a sentence changes, and
      // deriving it means counting words out of JSX for a badge.
      meta={[
        { label: 'Tracking cookies', value: 'None' },
        { label: 'Account deletion', value: 'Self-serve' },
      ]}
      notice={{
        eyebrow: 'Read this first',
        heading: 'We collect as little as',
        headingAccent: 'possible.',
        body: `${shopName} is a portfolio project, not a storefront. There's no advertising network, no data broker, and nothing to sell — so what we hold is the minimum an account needs to work. This page is written in plain English rather than legalese, and it says what actually happens, including the parts that are less tidy than we'd like.`,
        pills: [
          'No data is ever sold',
          'No advertising network',
          'No tracking cookies',
        ],
      }}
      withContents
      sections={sections}
      closing={{
        heading: 'Privacy questions?',
        body: (
          <>
            Ask and you&apos;ll get a real answer — or email{' '}
            <a href={`mailto:${email}`} className={LEGAL_LINK_CLASS}>
              {email}
            </a>
            . The{' '}
            <Link href='/terms' className={LEGAL_LINK_CLASS}>
              Terms
            </Link>{' '}
            cover the rest of the ground rules.
          </>
        ),
        ctaHref: '/contact',
        ctaLabel: 'Contact us',
      }}
    />
  );
}
