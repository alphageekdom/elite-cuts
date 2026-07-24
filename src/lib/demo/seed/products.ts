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

// 39 products, each paired with an image file in public/images/products/.
// No cross-category placeholders — every product's image actually shows
// that product. All 9 PRODUCT_CATEGORIES are covered. The pork-italian-
// sausage.jpg image is shared between the Pork "Italian Sausage Pack
// (Pork)" entry and the Sausage "House Italian Sausage Pack" entry; a
// category-specific sausage image would let those two diverge visually.
export const DEMO_PRODUCTS: DemoProductSeed[] = [
  // ── Beef (7) ─────────────────────────────────────────────────────────
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
    images: [
      'beef-ground-chuck.jpg',
      '/images/products/gallery/beef-ground-chuck-2.jpg',
      '/images/products/gallery/beef-ground-chuck-3.jpg',
      '/images/products/gallery/beef-ground-chuck-4.jpg',
    ],
    isFeatured: true,
  },
  {
    name: 'NY Strip Steak',
    category: 'Beef',
    cutType: 'NY Strip',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 28.99,
    estimatedWeightLb: 0.75,
    minWeightLb: 0.6,
    maxWeightLb: 1,
    description:
      'USDA Prime strip steak with a defined fat cap and a firm, beefy chew. The steakhouse staple.',
    rating: 4.7,
    stockCount: 16,
    images: ['beef-ny-strip.jpg'],
  },
  {
    name: 'Dry-Aged Ribeye',
    category: 'Beef',
    cutType: 'Ribeye',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 32.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.25,
    description:
      'USDA Prime ribeye, dry-aged 28 days in-house. Concentrated flavor, deep marbling, butter-soft texture.',
    rating: 4.9,
    stockCount: 12,
    images: [
      'beef-ribeye-dry-aged.jpg',
      '/images/products/gallery/beef-ribeye-dry-aged-2.jpg',
      '/images/products/gallery/beef-ribeye-dry-aged-3.jpg',
      '/images/products/gallery/beef-ribeye-dry-aged-4.jpg',
    ],
    isFeatured: true,
    isAged: true,
  },
  {
    name: 'Bone-In Beef Short Ribs',
    category: 'Beef',
    cutType: 'Short Rib',
    qualityTier: 'standard',
    pricingType: 'per_lb',
    pricePerLb: 14.99,
    estimatedWeightLb: 2,
    minWeightLb: 1.5,
    maxWeightLb: 3,
    description:
      'Thick, English-cut bone-in short ribs. Heavily marbled and made for a long braise.',
    rating: 4.7,
    stockCount: 18,
    images: ['beef-short-ribs.jpg'],
  },
  {
    name: 'T-Bone Steak',
    category: 'Beef',
    cutType: 'T-Bone',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 26.99,
    estimatedWeightLb: 1.25,
    minWeightLb: 1,
    maxWeightLb: 1.75,
    description:
      'Strip on one side, tenderloin on the other — the best of both worlds, cut thick over the bone.',
    rating: 4.8,
    stockCount: 10,
    images: ['beef-t-bone.jpg'],
  },
  {
    name: 'Tomahawk Steak',
    category: 'Beef',
    cutType: 'Tomahawk',
    qualityTier: 'prime',
    pricingType: 'per_lb',
    pricePerLb: 36.99,
    estimatedWeightLb: 2.5,
    minWeightLb: 2,
    maxWeightLb: 3,
    description:
      'A long-bone ribeye trimmed clean — the show-stopper cut. Built for the grill or a hot cast-iron sear.',
    rating: 4.9,
    stockCount: 6,
    images: [
      'beef-tomahawk.jpg',
      '/images/products/gallery/beef-tomahawk-2.jpg',
      '/images/products/gallery/beef-tomahawk-3.jpg',
      '/images/products/gallery/beef-tomahawk-4.jpg',
    ],
    isFeatured: true,
  },

  // ── Chicken (5) ──────────────────────────────────────────────────────
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
    images: ['chicken-breast.jpg'],
  },
  {
    name: 'Chicken Drumsticks Pack',
    category: 'Chicken',
    cutType: 'Drumstick',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 7.99,
    packageWeightLb: 1.5,
    description:
      'Bone-in skin-on drumsticks from pasture-raised birds. Kid-friendly, weeknight-ready.',
    rating: 4.5,
    stockCount: 24,
    images: ['chicken-drumstick.jpg'],
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
    images: ['chicken-thighs.jpg'],
  },
  {
    name: 'Chicken Wings Pack',
    category: 'Chicken',
    cutType: 'Wing',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 9.99,
    packageWeightLb: 2,
    description:
      'Whole party wings, flats and drums together. Best deep-fried, roasted, or smoked.',
    rating: 4.7,
    stockCount: 20,
    images: ['chicken-wings.jpg'],
    isNewArrival: true,
  },
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
    images: [
      'chicken-whole.jpg',
      '/images/products/gallery/chicken-whole-2.jpg',
      '/images/products/gallery/chicken-whole-3.jpg',
      '/images/products/gallery/chicken-whole-4.jpg',
    ],
    isFeatured: true,
  },

  // ── Pork (8) ─────────────────────────────────────────────────────────
  {
    name: 'Baby Back Ribs',
    category: 'Pork',
    cutType: 'Rib',
    qualityTier: 'standard',
    pricingType: 'per_lb',
    pricePerLb: 7.99,
    estimatedWeightLb: 2.5,
    minWeightLb: 2,
    maxWeightLb: 3.5,
    description:
      'Whole rack of baby back ribs from heritage hogs. Tender, lean, and ready for low-and-slow.',
    rating: 4.7,
    stockCount: 12,
    images: ['pork-baby-back-ribs.jpg'],
  },
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
    name: 'Pork Belly',
    category: 'Pork',
    cutType: 'Belly',
    qualityTier: 'standard',
    pricingType: 'per_lb',
    pricePerLb: 10.99,
    estimatedWeightLb: 1.5,
    minWeightLb: 1,
    maxWeightLb: 2.5,
    description:
      'Skin-on slab pork belly from heritage hogs. Cure it, braise it, or slice and roast — endlessly versatile.',
    rating: 4.7,
    stockCount: 10,
    images: ['pork-belly.jpg'],
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
    name: 'Whole Bone-In Ham',
    category: 'Pork',
    cutType: 'Ham',
    qualityTier: 'standard',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 5.99,
    averageWeightLb: 8,
    minWeightLb: 6,
    maxWeightLb: 11,
    description:
      'Bone-in cured ham, hardwood-smoked in-house. The centerpiece for a Sunday table.',
    rating: 4.7,
    stockCount: 5,
    images: ['pork-ham.jpg'],
  },
  {
    name: 'House Italian Sausage Pack (Pork)',
    category: 'Pork',
    cutType: 'Italian Sausage',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 10.99,
    packageWeightLb: 1,
    description:
      'House-made pork sausage seasoned with fennel, garlic, and a hint of paprika. Five links per pack.',
    rating: 4.6,
    stockCount: 18,
    images: ['pork-italian-sausage.jpg'],
  },
  {
    name: 'Boneless Pork Loin Roast',
    category: 'Pork',
    cutType: 'Loin Roast',
    qualityTier: 'standard',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 5.99,
    averageWeightLb: 2.5,
    minWeightLb: 2,
    maxWeightLb: 3.5,
    description:
      'Boneless center-cut pork loin from heritage hogs. Lean, easy to carve, and great for studding with garlic and herbs before roasting.',
    rating: 4.6,
    stockCount: 10,
    images: ['pork-loin-roast.jpg'],
  },
  {
    name: 'Pork Tenderloin',
    category: 'Pork',
    cutType: 'Tenderloin',
    qualityTier: 'premium',
    pricingType: 'per_lb',
    pricePerLb: 9.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.5,
    description:
      'The leanest, most tender cut of the hog. Quick-cooking and forgiving — great for a weeknight roast.',
    rating: 4.7,
    stockCount: 14,
    images: ['pork-tenderloin.jpg'],
  },

  // ── Lamb (4) ─────────────────────────────────────────────────────────
  {
    name: 'Boneless Lamb Leg',
    category: 'Lamb',
    cutType: 'Leg',
    qualityTier: 'premium',
    pricingType: 'whole_item_by_weight',
    pricePerLb: 14.99,
    averageWeightLb: 4,
    minWeightLb: 3,
    maxWeightLb: 6,
    description:
      'Boned, rolled, and tied — ready for the oven or the grill. A clean, lean centerpiece roast.',
    rating: 4.6,
    stockCount: 8,
    images: ['lamb-leg-boneless.jpg'],
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
    images: [
      'lamb-loin-chops.jpg',
      '/images/products/gallery/lamb-loin-chops-2.jpg',
      '/images/products/gallery/lamb-loin-chops-3.jpg',
      '/images/products/gallery/lamb-loin-chops-4.jpg',
    ],
    isFeatured: true,
  },
  {
    name: 'Rack of Lamb',
    category: 'Lamb',
    cutType: 'Rack',
    qualityTier: 'premium',
    pricingType: 'per_lb',
    pricePerLb: 29.99,
    estimatedWeightLb: 1.5,
    minWeightLb: 1.2,
    maxWeightLb: 1.8,
    description:
      'French-trimmed rack with the chine bone removed. Roast whole and slice into chops at the table.',
    rating: 4.9,
    stockCount: 6,
    images: ['lamb-rack.jpg'],
  },
  {
    name: 'Lamb Shanks Pack',
    category: 'Lamb',
    cutType: 'Shank',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 13.99,
    packageWeightLb: 1.5,
    description:
      'Two bone-in lamb shanks per pack. Made for a long, slow braise — pulls clean off the bone.',
    rating: 4.7,
    stockCount: 11,
    images: ['lamb-shanks.jpg'],
  },

  // ── Sausage (3) ──────────────────────────────────────────────────────
  // pork-italian-sausage.jpg is shared with the Pork "House Italian
  // Sausage Pack (Pork)" entry above so each surface has a sausage
  // product. A category-specific sausage-*.jpg would let the two
  // products diverge visually.
  {
    name: 'House Italian Sausage Pack',
    category: 'Sausage',
    cutType: 'Italian Sausage',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 10.99,
    packageWeightLb: 1,
    description:
      'House-made links seasoned with fennel, garlic, and a hint of paprika. Five per pack.',
    rating: 4.6,
    stockCount: 18,
    images: ['pork-italian-sausage.jpg'],
  },
  {
    name: 'Smoked Chorizo Loops Pack',
    category: 'Sausage',
    cutType: 'Chorizo',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 12.99,
    packageWeightLb: 1,
    description:
      'Spanish-style chorizo seasoned with smoked paprika and garlic, hung and cold-smoked in-house. Slice for tapas or chop into a paella base.',
    rating: 4.8,
    stockCount: 14,
    images: ['sausage-chorizo.jpg'],
  },
  {
    name: 'Fresh Bratwurst Pack',
    category: 'Sausage',
    cutType: 'Bratwurst',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 11.99,
    packageWeightLb: 1,
    description:
      'House-made pork bratwurst seasoned with white pepper, nutmeg, and a touch of marjoram. Five fresh links per pack — grill, pan-fry, or simmer in beer.',
    rating: 4.7,
    stockCount: 16,
    images: ['sausage-bratwurst.jpg'],
  },

  // ── Charcuterie (5) ──────────────────────────────────────────────────
  {
    name: 'Capicola',
    category: 'Charcuterie',
    cutType: 'Cured',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 12.99,
    packageWeightLb: 0.5,
    description:
      'Dry-cured pork shoulder rubbed with paprika and black pepper. Sliced thin, ready for the board.',
    rating: 4.7,
    stockCount: 12,
    images: ['charcuterie-capicola.jpg'],
  },
  {
    name: 'Country Pâté',
    category: 'Charcuterie',
    cutType: 'Pâté',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 14.99,
    packageWeightLb: 0.5,
    description:
      'Rustic country pâté with pork, liver, and cognac. Spreads thick on crusty bread.',
    rating: 4.6,
    stockCount: 8,
    images: ['charcuterie-pate.jpg'],
  },
  {
    name: 'Prosciutto di Parma',
    category: 'Charcuterie',
    cutType: 'Prosciutto',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 16.99,
    packageWeightLb: 0.25,
    description:
      'Imported 24-month aged Parma prosciutto, hand-sliced and laid in petals. The classic.',
    rating: 4.9,
    stockCount: 10,
    images: [
      'charcuterie-prosciutto.jpg',
      '/images/products/gallery/charcuterie-prosciutto-2.jpg',
      '/images/products/gallery/charcuterie-prosciutto-3.jpg',
      '/images/products/gallery/charcuterie-prosciutto-4.jpg',
    ],
    isFeatured: true,
  },
  {
    name: 'House Salami',
    category: 'Charcuterie',
    cutType: 'Salami',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 11.99,
    packageWeightLb: 0.5,
    description:
      'House-made dry salami with garlic and fennel. Naturally cased and aged 6 weeks.',
    rating: 4.7,
    stockCount: 14,
    images: ['charcuterie-salami.jpg'],
  },
  {
    name: 'Soppressata',
    category: 'Charcuterie',
    cutType: 'Salami',
    qualityTier: 'premium',
    pricingType: 'fixed_package',
    packagePrice: 13.99,
    packageWeightLb: 0.5,
    description:
      'Calabrian-style dry-cured salami with hot red pepper. Pleasantly spicy, deeply flavored.',
    rating: 4.8,
    stockCount: 10,
    images: ['charcuterie-soppressata.jpg'],
  },

  // ── Other (2) ────────────────────────────────────────────────────────
  {
    name: 'Beef Suet',
    category: 'Other',
    cutType: 'Suet',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 5.99,
    packageWeightLb: 1,
    description:
      'Pure beef kidney fat, hand-trimmed. Render for cooking, savory pies, or feeding the songbirds.',
    rating: 4.4,
    stockCount: 12,
    images: ['other-beef-suet.jpg'],
  },
  {
    name: 'Beef Bone Marrow',
    category: 'Other',
    cutType: 'Marrow Bone',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 9.99,
    packageWeightLb: 1.5,
    description:
      'Center-cut marrow bones from grass-fed beef. Roast them whole, scoop onto toast.',
    rating: 4.6,
    stockCount: 14,
    images: ['other-bone-marrow.jpg'],
  },

  // ── Prepared (3) ─────────────────────────────────────────────────────
  {
    name: 'Smoked Hot Dogs Pack',
    category: 'Prepared',
    cutType: 'Hot Dog',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 8.99,
    packageWeightLb: 1,
    description:
      'Hardwood-smoked all-pork hot dogs in natural casings. Eight per pack, ready to warm and serve.',
    rating: 4.6,
    stockCount: 24,
    images: ['pork-hot-dog.jpg'],
  },
  {
    name: 'Hand-Formed Burger Patties Pack',
    category: 'Prepared',
    cutType: 'Burger',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 12.99,
    packageWeightLb: 1.5,
    description:
      'Coarse-ground 80/20 chuck, hand-formed into four 6 oz patties. Seasoned at grilling, not before.',
    rating: 4.7,
    stockCount: 20,
    images: ['prepared-burger-patties.jpg'],
  },
  {
    name: 'Dry-Rubbed Chicken Breasts Pack',
    category: 'Prepared',
    cutType: 'Breast',
    qualityTier: 'standard',
    pricingType: 'fixed_package',
    packagePrice: 10.99,
    packageWeightLb: 1.5,
    description:
      'Boneless breasts from pasture-raised birds, hand-rubbed with our house paprika and chili blend. Throw on the grill or sheet-pan straight from the package.',
    rating: 4.6,
    stockCount: 18,
    images: ['prepared-seasoned-chicken-breasts.jpg'],
  },

  // ── Bundles (2) ──────────────────────────────────────────────────────
  {
    name: 'Steakhouse Beef Sampler Bundle',
    category: 'Bundles',
    cutType: 'Mixed',
    qualityTier: 'prime',
    pricingType: 'bundle',
    bundlePrice: 159.99,
    includedItems: [
      '1 × T-bone steak (~1.25 lb)',
      '1 × Dry-aged ribeye (~1 lb)',
      '1 × NY strip steak (~0.75 lb)',
      '1 × Filet mignon (~0.5 lb)',
      '1 × Top sirloin (~0.75 lb)',
    ],
    description:
      'Five premium cuts in one box — everything you need for a steakhouse-style dinner at home. Hand-selected, butcher-trimmed.',
    rating: 4.9,
    stockCount: 6,
    images: [
      'bundles-beef-sampler.jpg',
      '/images/products/gallery/bundles-beef-sampler-2.jpg',
      '/images/products/gallery/bundles-beef-sampler-3.jpg',
      '/images/products/gallery/bundles-beef-sampler-4.jpg',
    ],
    isFeatured: true,
  },
  {
    name: 'Backyard Cookout Bundle',
    category: 'Bundles',
    cutType: 'Mixed',
    qualityTier: 'standard',
    pricingType: 'bundle',
    bundlePrice: 89.99,
    includedItems: [
      '2 × Smoked hot dogs',
      '2 × Hand-formed burger patties (6 oz each)',
      '1 × Top sirloin steak (~1 lb)',
      '1 × Filet medallion (~0.5 lb)',
      '1 × Stir-fry beef (~1 lb)',
    ],
    description:
      'Everything you need for a full Saturday cookout — links for the kids, burgers for the table, and a couple of steaks for the grown-ups.',
    rating: 4.7,
    stockCount: 8,
    images: ['bundles-cookout.jpg'],
  },
];
