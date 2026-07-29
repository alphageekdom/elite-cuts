import { AVATAR_COLORS, MEMBER_AVATAR_COLORS } from '@/lib/admin/constants';
import { avatarColorForId, getInitials } from '@/lib/format';
import type { TierInfo } from '@/lib/rewards/calculator';
import ProfileNav from './ProfileNav';
import TierCard from './TierCard';
import type { ProfileTabId } from './tabs';

// Dark ink-to-oxblood gradient with camel initials — admin only, matching
// every other avatar in the app.
const ADMIN_AVATAR_COLOR = 'bg-linear-to-br from-ink to-oxblood-deep text-camel';

type Props = {
  name: string;
  email: string;
  userId: string;
  isAdmin: boolean;
  isDemo: boolean;
  tier: TierInfo;
  qualifying: number;
  activeTab: ProfileTabId;
  counts: Partial<Record<ProfileTabId, number>>;
};

export default function ProfileSidebar({
  name,
  email,
  userId,
  isAdmin,
  isDemo,
  tier,
  qualifying,
  activeTab,
  counts,
}: Props) {
  const isMember = tier.tier !== 'regular';
  const avatarColor = isAdmin
    ? ADMIN_AVATAR_COLOR
    : avatarColorForId(userId, isMember ? MEMBER_AVATAR_COLORS : AVATAR_COLORS);

  return (
    <div className="flex flex-col gap-6 border-b border-line-soft py-7 lg:h-full lg:border-r lg:border-b-0 lg:py-8 lg:pr-6">
      {/* Identity */}
      <div className="flex items-center gap-3.5">
        <div
          className={`flex size-11.5 shrink-0 items-center justify-center rounded-full font-display text-[17px] tracking-[0.02em] select-none ${avatarColor}`}
        >
          {getInitials(name)}
        </div>
        {/* Identity, not standing. This line carried the tier label, three
            rows above a card that states it again — and on the Rewards tab a
            third time in the status card. The email is the thing the block was
            missing: on a demo account every visitor shares, it is the only
            answer to "whose account am I looking at". */}
        <div className="min-w-0">
          <p className="truncate font-display text-[19px] leading-tight">{name}</p>
          {email && (
            <p className="mt-1 truncate text-[11.5px] text-muted">{email}</p>
          )}
        </div>
      </div>

      <ProfileNav activeTab={activeTab} counts={counts} />

      <div className="h-px bg-line-soft" aria-hidden />

      {/* Not on the Rewards tab: that tab's status card is a bigger version of
          this one, down to the same qualifying fraction and the same progress
          bar. Two `role="progressbar"` elements were announcing "326 of 1,000
          qualifying points toward Master Cut" and "…to Master Cut" — one
          measurement read out twice, worded just differently enough to sound
          like two. */}
      {activeTab !== 'rewards' && (
        <TierCard qualifying={qualifying} tier={tier} />
      )}

      {/* The demo disclaimer says only what is true of the session reading it.
          A demo visitor's data really is wiped by the nightly reset; a normal
          account's is not, and telling them otherwise would be a fresh false
          claim on a page built to remove them. Neither line promises anything
          about email or messaging, because nothing sends either. */}
      <p className="text-[11.5px] leading-relaxed text-muted lg:mt-auto">
        {isDemo
          ? 'Portfolio demo. No order is ever filled, no card is charged, and everything on this account resets nightly.'
          : 'Portfolio demo. No order is ever filled and no card is charged.'}
      </p>
    </div>
  );
}
