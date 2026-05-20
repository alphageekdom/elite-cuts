import type { Product } from '@/models/Product';

// Seed shape: every authored product field, no auto-derived ones
// (`slug`, `price`, `unit`, `displayPriceLabel`, `displayWeightLabel`,
// `isEstimatedPrice` are all stamped by the Product model's pre-validate
// hook from `name` + the per-pricingType fields). The orchestrator uses
// `Product.create(...)` so that hook runs on every restore.
export type DemoProductSeed = Omit<
  Product,
  | 'slug'
  | 'price'
  | 'unit'
  | 'displayPriceLabel'
  | 'displayWeightLabel'
  | 'isEstimatedPrice'
  | 'createdAt'
  | 'updatedAt'
  // Boolean flags re-added below as optional so seed entries only need to
  // set the ones that are actually true.
  | 'isFeatured'
  | 'isAged'
  | 'isNewArrival'
  | 'isActive'
> & {
  isFeatured?: boolean;
  isAged?: boolean;
  isNewArrival?: boolean;
  isActive?: boolean;
};

// 20 products spanning every pricingType, with a 65/15/10/5/5 split
// (fixed_package/per_lb/whole_item_by_weight/each/bundle). Same data as
// scripts/seed-products.mjs. Display labels + slug are derived at insert
// time by the Product model's pre-validate hook.
export const DEMO_PRODUCTS: DemoProductSeed[] = [
  // ── Beef (5) ─────────────────────────────────────────────────────────
  {
    name: 'Ground Beef Pack (80/20)',
    category: 'Beef',
    cutType: 'Ground',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 8.99,
    packageWeightLb: 1,
    description:
      'Coarse-ground chuck with the ideal 80/20 fat ratio. Ground daily for burgers, meatballs, and meat sauce.',
    rating: 4.5,
    stockCount: 35,
    images: ['beef-ground-chuck.jpg'],
    isFeatured: true,
  },
  {
    name: 'Beef Stew Meat Pack',
    category: 'Beef',
    cutType: 'Stew',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 11.99,
    packageWeightLb: 1,
    description:
      'Hand-cut chuck cubes trimmed for braising. Holds together through a long simmer.',
    rating: 4.4,
    stockCount: 22,
    images: ['beef-short-ribs.jpg'],
  },
  {
    name: 'Ribeye Steak',
    category: 'Beef',
    cutType: 'Ribeye',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 24.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.25,
    description:
      'USDA Prime ribeye cut to order. Richly marbled, deeply flavored — built for a hot pan or open flame.',
    rating: 4.9,
    stockCount: 18,
    images: ['beef-ribeye-dry-aged.jpg'],
    isFeatured: true,
  },
  {
    name: 'Filet Mignon',
    category: 'Beef',
    cutType: 'Filet',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 39.99,
    estimatedWeightLb: 0.5,
    minWeightLb: 0.4,
    maxWeightLb: 0.75,
    description:
      'The most tender cut of beef, hand-trimmed and portioned. Buttery texture, clean mild flavor.',
    rating: 4.8,
    stockCount: 14,
    images: ['beef-filet-mignon.jpg'],
  },
  {
    name: 'Whole Brisket',
    category: 'Beef',
    cutType: 'Brisket',
    qualityTier: 'standard',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 8.99,
    averageWeightLb: 11,
    minWeightLb: 8,
    maxWeightLb: 14,
    description:
      'Full packer brisket with the point and flat intact. Made for low-and-slow smoking.',
    rating: 4.7,
    stockCount: 6,
    images: ['beef-tomahawk.jpg'],
    isAged: true,
  },

  // ── Chicken (4) ──────────────────────────────────────────────────────
  {
    name: 'Whole Fryer Chicken',
    category: 'Chicken',
    cutType: 'Whole Bird',
    qualityTier: 'standard',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 2.99,
    averageWeightLb: 3.75,
    minWeightLb: 3,
    maxWeightLb: 4.5,
    description:
      'Air-chilled whole bird. Crispier skin, cleaner flavor, ready for the roasting pan or spatchcock-and-grill.',
    rating: 4.7,
    stockCount: 20,
    images: ['poultry-whole-chicken.jpg'],
    isFeatured: true,
  },
  {
    name: 'Boneless Chicken Breast Pack',
    category: 'Chicken',
    cutType: 'Breast',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 8.99,
    packageWeightLb: 1.5,
    description:
      'Hand-trimmed boneless breasts from pasture-raised birds. Lean protein for any weeknight.',
    rating: 4.4,
    stockCount: 28,
    images: ['poultry-chicken-breast.jpg'],
  },
  {
    name: 'Chicken Thigh Family Pack',
    category: 'Chicken',
    cutType: 'Thigh',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 11.99,
    packageWeightLb: 2.5,
    description:
      'Bone-in, skin-on chicken thighs. The juiciest cut on the bird, ready for the grill or oven.',
    rating: 4.6,
    stockCount: 22,
    images: ['poultry-chicken-thighs.jpg'],
  },
  {
    name: 'Rotisserie Chicken',
    category: 'Chicken',
    cutType: 'Rotisserie',
    qualityTier: 'prepared',
    pricingType: 'each',
    unitPrice: 9.99,
    description: 'House-seasoned and rotisserie-cooked daily. Pickup hot off the spit.',
    rating: 4.7,
    stockCount: 12,
    images: ['poultry-whole-chicken.jpg'],
  },

  // ── Pork (4) ─────────────────────────────────────────────────────────
  {
    name: 'Thick-Cut Smoked Bacon Pack',
    category: 'Pork',
    cutType: 'Bacon',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 9.99,
    packageWeightLb: 0.75,
    description: 'Hardwood-smoked, thick-sliced bacon cured in-house. 12 oz package.',
    rating: 4.8,
    stockCount: 30,
    images: ['pork-bacon.jpg'],
    isNewArrival: true,
  },
  {
    name: 'Bone-In Pork Chop Pack',
    category: 'Pork',
    cutType: 'Chop',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 14.99,
    packageWeightLb: 2,
    description:
      'Thick-cut, frenched bone-in chops with rich marbling. Quick to cook, big on flavor.',
    rating: 4.6,
    stockCount: 14,
    images: ['pork-chops-bone-in.jpg'],
  },
  {
    name: 'Ground Pork Pack',
    category: 'Pork',
    cutType: 'Ground',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 7.99,
    packageWeightLb: 1,
    description:
      'Coarse-ground pork from heritage hogs. Great for meatballs, dumplings, and ragú.',
    rating: 4.5,
    stockCount: 24,
    images: ['pork-italian-sausage.jpg'],
  },
  {
    name: 'Pork Shoulder Roast',
    category: 'Pork',
    cutType: 'Shoulder',
    qualityTier: 'standard',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 4.99,
    averageWeightLb: 7,
    minWeightLb: 5,
    maxWeightLb: 9,
    description:
      'Skin-on, bone-in shoulder. Made for slow-roasted carnitas or low-and-slow pulled pork.',
    rating: 4.7,
    stockCount: 8,
    images: ['pork-belly.jpg'],
  },

  // ── Lamb (2) ─────────────────────────────────────────────────────────
  {
    name: 'Ground Lamb Pack',
    category: 'Lamb',
    cutType: 'Ground',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 12.99,
    packageWeightLb: 1,
    description:
      'Lean ground lamb for kofta, ragú, or burgers with a little more depth.',
    rating: 4.6,
    stockCount: 11,
    images: ['lamb-shanks.jpg'],
  },
  {
    name: 'Lamb Loin Chops',
    category: 'Lamb',
    cutType: 'Chop',
    qualityTier: 'premium',
    pricingType: 'per_lb',
    pricePerLb: 24.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.5,
    description:
      'Mini T-bones from the lamb loin. Quick-cooking, rich, and perfect for the grill.',
    rating: 4.8,
    stockCount: 8,
    images: ['lamb-loin-chops.jpg'],
    isFeatured: true,
  },

  // ── Sausage (2) ──────────────────────────────────────────────────────
  {
    name: 'House Italian Sausage Pack',
    category: 'Sausage',
    cutType: 'Italian Sausage',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 10.99,
    packageWeightLb: 1,
    description:
      'House-made links seasoned with fennel, garlic, and a hint of paprika.',
    rating: 4.6,
    stockCount: 18,
    images: ['pork-italian-sausage.jpg'],
  },
  {
    name: 'Smoked Bratwurst Pack',
    category: 'Sausage',
    cutType: 'Bratwurst',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 11.99,
    packageWeightLb: 1,
    description: 'Hardwood-smoked brats, ready to heat and eat. 4 links per pack.',
    rating: 4.7,
    stockCount: 14,
    images: ['pork-italian-sausage.jpg'],
  },

  // ── Prepared (2) ─────────────────────────────────────────────────────
  {
    name: 'House Burger Patty Pack',
    category: 'Prepared',
    cutType: 'Burger Patty',
    qualityTier: 'prepared',
    pricingType: 'fixed_package',
    packagePrice: 13.99,
    packageWeightLb: 1.33,
    description:
      'Four 1/3-lb patties hand-formed from 80/20 chuck. Salt-and-pepper only — let the beef do the work.',
    rating: 4.7,
    stockCount: 16,
    images: ['beef-ground-chuck.jpg'],
  },
  {
    name: 'Meatball Pack',
    category: 'Prepared',
    cutType: 'Meatballs',
    qualityTier: 'prepared',
    pricingType: 'fixed_package',
    packagePrice: 12.99,
    packageWeightLb: 1,
    description:
      'House-rolled meatballs blending beef and pork with garlic, parmesan, and parsley.',
    rating: 4.6,
    stockCount: 12,
    images: ['pork-italian-sausage.jpg'],
  },

  // ── Bundles (1) ──────────────────────────────────────────────────────
  {
    name: 'Family Grill Pack',
    category: 'Bundles',
    cutType: 'Mixed Bundle',
    qualityTier: 'standard',
    pricingType: 'bundle',
    bundlePrice: 89.99,
    includedItems: [
      '2.5 lb chicken thigh pack',
      '1 lb ground beef pack',
      '1 lb sausage pack',
      '2 lb bone-in pork chops',
    ],
    description:
      'Built for a weekend cookout — a mix of chicken, beef, sausage, and pork from the same case the butcher works through every day.',
    rating: 4.8,
    stockCount: 6,
    images: ['beef-tomahawk.jpg'],
    isFeatured: true,
  },
];
