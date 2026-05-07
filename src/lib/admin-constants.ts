export const AVATAR_COLORS = [
  'bg-camel text-ink',
  'bg-oxblood text-cream',
  'bg-ink text-cream',
  'bg-camel-soft text-ink',
  'bg-green text-cream',
  'bg-[#5C7E3F] text-cream',
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
