export const PRODUCT_CATEGORIES = ['Beef', 'Pork', 'Poultry', 'Lamb', 'Charcuterie', 'Other'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
