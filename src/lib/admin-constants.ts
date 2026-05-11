export const AVATAR_COLORS = [
  'bg-camel text-ink',
  'bg-oxblood text-cream',
  'bg-ink text-cream',
  'bg-camel-soft text-ink',
  'bg-green text-cream',
  'bg-[#3d5c2a] text-cream',
] as const;

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

export const PRODUCT_CATEGORIES = ['Beef', 'Pork', 'Poultry', 'Lamb', 'Charcuterie', 'Other'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Beef: 'bg-red-soft text-oxblood',
  Pork: 'bg-[rgba(184,137,90,0.18)] text-camel',
  Lamb: 'bg-[rgba(28,24,20,0.08)] text-ink-soft',
  Poultry: 'bg-green-soft text-green',
  Charcuterie: 'bg-[rgba(184,137,90,0.12)] text-camel',
  Other: 'bg-[rgba(28,24,20,0.06)] text-muted',
};
