import DeleteAccountSection from '@/components/profile/DeleteAccountSection';
import ProfileAddresses from '@/components/profile/ProfileAddresses';
import ProfileInfoForm from '@/components/profile/ProfileInfoForm';
import ProfilePaymentMethods from '@/components/profile/ProfilePaymentMethods';
import UpdateProfile from '@/components/profile/UpdateProfile';
import type { SerializedAddress } from '@/types/address';

type Props = {
  name: string;
  email: string;
  phone: string;
  addresses: SerializedAddress[];
  isAdmin: boolean;
};

function Card({
  title,
  accent,
  subtitle,
  children,
}: {
  title: string;
  accent: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-line-soft bg-paper p-6 sm:p-7">
      <h2 className="font-display text-[23px] leading-tight tracking-tight">
        {title} <em className="italic text-oxblood">{accent}</em>
      </h2>
      {subtitle && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {subtitle}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Payment methods, Addresses and Settings, collapsed into one section.
 *
 * Every control the three separate tabs carried is still here: edit info,
 * change password, add / remove / re-date a card, add / edit an address, and
 * delete the account.
 *
 * Two things from the design are deliberately absent. The three notification
 * toggles ("Order ready texts", "Weekly specials", "Emailed receipts") have no
 * preference field, no sender and no job behind any of them — the same
 * fiction was removed from this page and the register page once each already,
 * both times with a note not to reinstate it without a field. And the blanket
 * "Editing is off in demo mode" subtitle was wrong: addresses are not guarded,
 * so the demo hints stay on the individual controls that really are disabled.
 */
export default function AccountTab({
  name,
  email,
  phone,
  addresses,
  isAdmin,
}: Props) {
  return (
    <div>
      <header>
        <h1 className="font-display text-[34px] leading-none tracking-tight sm:text-[40px]">
          Account
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          Your details, cards and addresses, in one place.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Profile" accent="info">
          <ProfileInfoForm
            initialName={name}
            initialEmail={email}
            initialPhone={phone}
          />
        </Card>

        <Card title="Change" accent="password">
          <UpdateProfile />
        </Card>

        <Card
          title="Payment"
          accent="methods"
          subtitle="Cards saved at checkout, or added here. The card is charged when you order — there is no pay-at-the-counter option."
        >
          <ProfilePaymentMethods />
        </Card>

        <Card
          title="Saved"
          accent="addresses"
          subtitle="Used for delivery. Pickup orders are collected at the counter and need no address."
        >
          <ProfileAddresses addresses={addresses} headless />
        </Card>
      </div>

      {/* Admins can't self-delete, so the danger zone stays off their view. */}
      {!isAdmin && (
        <div className="mt-5">
          <DeleteAccountSection />
        </div>
      )}
    </div>
  );
}
