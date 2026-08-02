import { avatarColorForId } from '@/lib/format';

export const AVATAR_COLORS = [
  'bg-camel text-ink',
  'bg-oxblood text-cream',
  'bg-ink text-cream',
  'bg-camel-soft text-ink',
  'bg-green text-cream',
  'bg-[#3d5c2a] text-cream',
] as const;

/** Points at which an account reads as a member (Connoisseur / Master Cut). */
export const MEMBER_POINTS_THRESHOLD = 250;

// Gradient avatars for members (Connoisseur / Master Cut, ≥ 250 pts).
// Index 2 = oxblood — reserved for Tangerine Dev's hash slot.
export const MEMBER_AVATAR_COLORS = [
  'bg-linear-to-br from-camel to-[#a07445] text-ink',
  'bg-linear-to-br from-ink to-[#2d2722] text-cream',
  'bg-linear-to-br from-oxblood to-oxblood-deep text-cream',
  'bg-linear-to-br from-[#4a6b3a] to-[#3d5c2a] text-cream',
  'bg-linear-to-br from-[#7a5c3a] to-[#5a3820] text-cream',
  'bg-linear-to-br from-camel-soft to-[#c4a381] text-ink',
] as const;

/** Admins get one fixed gradient rather than a hashed slot. */
export const ADMIN_AVATAR =
  'bg-linear-to-br from-ink to-oxblood-deep text-camel';

/**
 * The avatar swatch for an account, by role then membership.
 *
 * Lives here rather than in either menu because it is a display *rule*, not
 * markup: the desktop account menu and the mobile nav sheet both need it, and
 * a second copy would put the 250-point member threshold in two places to
 * drift apart.
 */
export function resolveAvatarColor(
  userId: string,
  isAdmin: boolean,
  rewardPoints: number,
): string {
  if (isAdmin) return ADMIN_AVATAR;
  return avatarColorForId(
    userId,
    rewardPoints >= MEMBER_POINTS_THRESHOLD
      ? MEMBER_AVATAR_COLORS
      : AVATAR_COLORS,
  );
}

export const PRODUCT_CATEGORIES = [
  'Beef',
  'Chicken',
  'Pork',
  'Lamb',
  'Sausage',
  'Prepared',
  'Bundles',
  'Charcuterie',
  'Other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// Each pill tints its own background, so the text token has to be the deeper
// variant of its hue to clear 4.5:1 at the 10px these render at. Charcuterie
// measured 3.95:1 and Pork 4.28:1 with the plain tokens.
export const CATEGORY_COLORS: Record<string, string> = {
  Beef: 'bg-red-soft text-oxblood',
  Chicken: 'bg-green-soft text-green-deep',
  Pork: 'bg-[rgba(184,137,90,0.18)] text-camel-deeper',
  Lamb: 'bg-[rgba(28,24,20,0.08)] text-ink-soft',
  Sausage: 'bg-[rgba(184,137,90,0.12)] text-camel-deeper',
  Prepared: 'bg-[rgba(28,24,20,0.06)] text-muted-deep',
  Bundles: 'bg-[rgba(74,107,58,0.12)] text-green-deep',
  Charcuterie: 'bg-[rgba(122,92,58,0.18)] text-camel-deeper',
  Other: 'bg-cream-deep text-ink-soft',
};
