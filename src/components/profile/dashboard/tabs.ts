// The dashboard's sections, in nav order.
//
// `saved` is not in the redesign's nav sketch, which drew five entries, but
// Saved cuts is a shipped feature — the save-heart on every product card
// writes to it — so dropping the destination would orphan that control. It
// keeps its existing `?tab=saved` URL, which also means any link a customer
// already has still lands in the right place.
//
// Payment methods, Addresses and Settings are deliberately absent: all three
// collapsed into Account.
// `countNoun` is [singular, plural] for the nav badge's spoken label. It is
// not derived from `label` because two of them would then lie: the messages
// badge counts *open* conversations rather than all of them, and lower-casing
// the label produced "1 messages" / "1 saved cuts".
export const PROFILE_TABS = [
  { id: 'overview', label: 'Overview', href: '/profile' },
  {
    id: 'orders',
    label: 'Orders',
    href: '/profile?tab=orders',
    countNoun: ['order', 'orders'],
  },
  {
    id: 'saved',
    label: 'Saved cuts',
    href: '/profile?tab=saved',
    countNoun: ['saved cut', 'saved cuts'],
  },
  { id: 'rewards', label: 'Rewards', href: '/profile?tab=rewards' },
  {
    id: 'messages',
    label: 'Messages',
    href: '/profile?tab=messages',
    countNoun: ['open message', 'open messages'],
  },
  { id: 'account', label: 'Account', href: '/profile?tab=account' },
] as const;

export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];

const TAB_IDS = new Set<string>(PROFILE_TABS.map((t) => t.id));

// Old URLs kept working: the three tabs that merged into Account, plus the
// pre-redesign spelling of the payment tab. A bookmarked `?tab=addresses`
// lands on Account rather than silently falling back to Overview, which
// would look like the section had been deleted.
const LEGACY_TABS: Record<string, ProfileTabId> = {
  addresses: 'account',
  paymentmethods: 'account',
  settings: 'account',
};

/** Maps a raw `?tab=` value to a real section, defaulting to Overview. */
export function resolveTab(raw: string | undefined): ProfileTabId {
  if (!raw) return 'overview';
  if (TAB_IDS.has(raw)) return raw as ProfileTabId;
  return LEGACY_TABS[raw.toLowerCase()] ?? 'overview';
}
