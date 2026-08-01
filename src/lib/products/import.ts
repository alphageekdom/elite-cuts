// CSV import helpers — pure functions, no I/O. The HTTP route at
// `src/app/api/products/import/route.ts` is the only caller; everything
// here is testable in isolation.
//
// Shape of the work:
//   1. The route validates each CSV row through `productInputSchema` and
//      hands the validated `ProductInput` here.
//   2. `toProductDoc` converts that into a flat document ready for
//      `ProductModel.bulkWrite`, stamping the backcompat display fields
//      (price, unit, displayPriceLabel, displayWeightLabel,
//      isEstimatedPrice) because bulkWrite bypasses pre-save / pre-validate
//      hooks on inserts.
//   3. `diffParsedAgainstExisting` produces the per-row diff + warning
//      list the admin sees in the import drawer preview.

import { slugify } from '@/lib/slugify';
import { stampPricingDerivedFields, unitPrice } from '@/lib/products/pricing';
import type { ProductInput } from '@/lib/products/schema';
import type { PricingType, MeatQualityTier } from '@/lib/products/constants';
import type { ProductCategory } from '@/lib/admin/constants';

// Authorable fields across every pricingType, in the order the CSV emits
// them. Both the import REQUIRED_HEADERS and export EXPORT_COLUMNS read
// from this list so the round-trip is always symmetrical.
export const CSV_COLUMNS = [
  'slug',
  'name',
  'description',
  'category',
  'cutType',
  'qualityTier',
  'pricingType',
  'packagePrice',
  'packageWeightLb',
  'pricePerLb',
  'estimatedWeightLb',
  'averageWeightLb',
  'minWeightLb',
  'maxWeightLb',
  'unitPrice',
  'bundlePrice',
  'includedItems',
  'stock',
  'sku',
  'gradeBreed',
  'supplier',
  'parLevel',
  'reorderPoint',
  'isFeatured',
  'isActive',
  'isAged',
  'isNewArrival',
] as const;

// Doc shape written by bulkWrite. Mirrors Product model authorable fields
// plus the five stamped backcompat / display fields. Optional fields stay
// optional — Mongoose strips undefined entries from $set on update and
// applies schema defaults on insert.
export type ProductDoc = {
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  cutType: string;
  qualityTier: MeatQualityTier;
  pricingType: PricingType;
  packagePrice?: number;
  packageWeightLb?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  includedItems?: string[];
  stockCount: number;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
  parLevel?: number;
  reorderPoint?: number;
  isFeatured: boolean;
  isActive: boolean;
  isAged: boolean;
  isNewArrival: boolean;
  // Stamped derived fields — bulkWrite bypasses pre-validate hooks, so the
  // importer writes these directly. The model hook calls the same helper.
  price: number;
  unit: 'lb' | 'each';
  displayPriceLabel: string;
  displayWeightLabel: string;
  isEstimatedPrice: boolean;
};

// Every optional key on `ProductDoc` — the ones a CSV row can leave blank.
//
// `toProductDoc` sets these to `undefined` when the column is empty, and
// Mongoose drops undefined keys from `$set`, so an update alone can never
// clear one. The import route pairs each omitted field with an explicit
// `$unset`. Kept beside `ProductDoc` because the two must stay in step: a new
// optional field added there and missed here would silently become
// un-clearable.
export const CLEARABLE_PRODUCT_FIELDS = [
  'packagePrice',
  'packageWeightLb',
  'pricePerLb',
  'estimatedWeightLb',
  'averageWeightLb',
  'minWeightLb',
  'maxWeightLb',
  'unitPrice',
  'bundlePrice',
  'includedItems',
  'sku',
  'gradeBreed',
  'supplier',
  'parLevel',
  'reorderPoint',
] as const satisfies ReadonlyArray<keyof ProductDoc>;

// Existing-doc projection used by the diff. The find query in the route
// projects exactly these fields so the diff has everything it needs
// without pulling images / rating / timestamps. `price` stays on this
// shape because legacy pre-Phase-1 docs lack pricingType but still have
// a price — `unitPrice(existing, existing.price)` falls back to it for
// the swing warning.
export type ExistingProductRow = {
  _id: { toString(): string };
  slug?: string;
  name: string;
  description: string;
  category: string;
  cutType?: string;
  qualityTier?: MeatQualityTier;
  pricingType?: PricingType;
  packagePrice?: number;
  packageWeightLb?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  includedItems?: string[];
  price: number;
  stockCount: number;
  sku?: string;
  gradeBreed?: string;
  supplier?: string;
  parLevel?: number;
  reorderPoint?: number;
  isFeatured: boolean;
  isActive: boolean;
  isAged: boolean;
  isNewArrival: boolean;
};

// Field list for `.find().lean()` — keep in sync with ExistingProductRow.
export const EXISTING_PRODUCT_PROJECTION =
  '_id slug name description category cutType qualityTier pricingType ' +
  'packagePrice packageWeightLb pricePerLb estimatedWeightLb averageWeightLb ' +
  'minWeightLb maxWeightLb unitPrice bundlePrice includedItems ' +
  'price stockCount sku gradeBreed supplier parLevel reorderPoint ' +
  'isFeatured isActive isAged isNewArrival';

export type DiffField =
  | 'name'
  | 'description'
  | 'category'
  | 'cutType'
  | 'qualityTier'
  | 'pricingType'
  | 'packagePrice'
  | 'packageWeightLb'
  | 'pricePerLb'
  | 'estimatedWeightLb'
  | 'averageWeightLb'
  | 'minWeightLb'
  | 'maxWeightLb'
  | 'unitPrice'
  | 'bundlePrice'
  | 'includedItems'
  | 'stock'
  | 'sku'
  | 'gradeBreed'
  | 'supplier'
  | 'parLevel'
  | 'reorderPoint'
  | 'isFeatured'
  | 'isActive'
  | 'isAged'
  | 'isNewArrival';

export type DiffEntry = { field: DiffField; from: unknown; to: unknown };

export type RowResult =
  | { index: number; status: 'create'; slug: string; name: string; warnings?: string[]; diff?: never; error?: never }
  | { index: number; status: 'update'; slug: string; name: string; diff: DiffEntry[]; warnings?: string[]; error?: never }
  | { index: number; status: 'skip';   slug: string; name: string; warnings?: string[]; diff?: never; error?: never }
  | { index: number; status: 'error';  slug: string; name: string; error: string; warnings?: never; diff?: never };

// Normalize for comparison: empty string / null → undefined, empty array →
// undefined. Keeps "missing on parsed" and "missing on existing" from
// surfacing as a noisy diff just because Mongoose's schema default writes
// an empty string while the CSV column is blank.
function norm(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  if (Array.isArray(value)) return value.length === 0 ? undefined : value;
  return value;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (Array.isArray(na) && Array.isArray(nb)) {
    return JSON.stringify(na) === JSON.stringify(nb);
  }
  return na === nb;
}

// Tuples of [csv-side field on ProductInput, db-side field on Existing] —
// most are identical, `stock` is the one rename.
const COMPARISONS: { diffKey: DiffField; parsedKey: keyof ProductInput; existingKey: keyof ExistingProductRow }[] = [
  { diffKey: 'name',              parsedKey: 'name',              existingKey: 'name' },
  { diffKey: 'description',       parsedKey: 'description',       existingKey: 'description' },
  { diffKey: 'category',          parsedKey: 'category',          existingKey: 'category' },
  { diffKey: 'cutType',           parsedKey: 'cutType',           existingKey: 'cutType' },
  { diffKey: 'qualityTier',       parsedKey: 'qualityTier',       existingKey: 'qualityTier' },
  { diffKey: 'pricingType',       parsedKey: 'pricingType',       existingKey: 'pricingType' },
  { diffKey: 'packagePrice',      parsedKey: 'packagePrice',      existingKey: 'packagePrice' },
  { diffKey: 'packageWeightLb',   parsedKey: 'packageWeightLb',   existingKey: 'packageWeightLb' },
  { diffKey: 'pricePerLb',        parsedKey: 'pricePerLb',        existingKey: 'pricePerLb' },
  { diffKey: 'estimatedWeightLb', parsedKey: 'estimatedWeightLb', existingKey: 'estimatedWeightLb' },
  { diffKey: 'averageWeightLb',   parsedKey: 'averageWeightLb',   existingKey: 'averageWeightLb' },
  { diffKey: 'minWeightLb',       parsedKey: 'minWeightLb',       existingKey: 'minWeightLb' },
  { diffKey: 'maxWeightLb',       parsedKey: 'maxWeightLb',       existingKey: 'maxWeightLb' },
  { diffKey: 'unitPrice',         parsedKey: 'unitPrice',         existingKey: 'unitPrice' },
  { diffKey: 'bundlePrice',       parsedKey: 'bundlePrice',       existingKey: 'bundlePrice' },
  { diffKey: 'includedItems',     parsedKey: 'includedItems',     existingKey: 'includedItems' },
  { diffKey: 'stock',             parsedKey: 'stock',             existingKey: 'stockCount' },
  { diffKey: 'sku',               parsedKey: 'sku',               existingKey: 'sku' },
  { diffKey: 'gradeBreed',        parsedKey: 'gradeBreed',        existingKey: 'gradeBreed' },
  { diffKey: 'supplier',          parsedKey: 'supplier',          existingKey: 'supplier' },
  { diffKey: 'parLevel',          parsedKey: 'parLevel',          existingKey: 'parLevel' },
  { diffKey: 'reorderPoint',      parsedKey: 'reorderPoint',      existingKey: 'reorderPoint' },
  { diffKey: 'isFeatured',        parsedKey: 'isFeatured',        existingKey: 'isFeatured' },
  { diffKey: 'isActive',          parsedKey: 'isActive',          existingKey: 'isActive' },
  { diffKey: 'isAged',            parsedKey: 'isAged',            existingKey: 'isAged' },
  { diffKey: 'isNewArrival',      parsedKey: 'isNewArrival',      existingKey: 'isNewArrival' },
];

export function diffParsedAgainstExisting(
  parsed: ProductInput,
  existing: ExistingProductRow,
): { diff: DiffEntry[]; warnings: string[] } {
  const diff: DiffEntry[] = [];
  const warnings: string[] = [];

  // Rename warning — slug matches but name moved.
  if (parsed.name !== existing.name && parsed.slug && parsed.slug === existing.slug) {
    warnings.push('Slug matches an existing product but the name differs — confirm this is a rename');
  }

  for (const { diffKey, parsedKey, existingKey } of COMPARISONS) {
    const fromVal = norm(existing[existingKey]);
    const toVal = norm(parsed[parsedKey]);
    if (!valuesEqual(fromVal, toVal)) {
      diff.push({ field: diffKey, from: fromVal, to: toVal });
    }
  }

  // Price-swing warning — compare per-unit estimated cost across both
  // sides so the warning stays meaningful when pricingType changes.
  // Legacy docs (no pricingType) fall back to `existing.price`.
  const fromUnit = unitPrice(existing, existing.price);
  const toUnit = unitPrice(parsed);
  if (fromUnit > 0 && toUnit > 0) {
    const delta = Math.abs(toUnit - fromUnit) / fromUnit;
    if (delta > 0.5) warnings.push('Price change is unusually large (>50%)');
  }

  return { diff, warnings };
}

// Classifier outcome for a single CSV row that's already passed Zod
// validation. The route maps these directly onto RowResult and onto the
// bulkWrite ops list. Legacy-backfill (existing doc missing slug) flags
// an update even when no other field moved, so the slug gets written
// during commit.
export type RowOutcome =
  | { status: 'create' }
  | { status: 'update'; diff: DiffEntry[]; warnings: string[]; legacyBackfill: boolean }
  | { status: 'skip' };

export function classifyRow(
  parsed: ProductInput,
  existing: ExistingProductRow | undefined,
): RowOutcome {
  if (!existing) return { status: 'create' };

  const { diff, warnings } = diffParsedAgainstExisting(parsed, existing);
  const legacyBackfill = !existing.slug;

  if (diff.length === 0 && !legacyBackfill) return { status: 'skip' };
  return { status: 'update', diff, warnings, legacyBackfill };
}

// Two CSV rows that resolve to the same slug would race during commit.
// Surface the second + later collisions as errors so the admin can fix
// them before re-uploading; the kept list preserves input order so
// downstream find queries hit existing docs predictably.
export type DedupResult<T> = {
  kept: T[];
  duplicates: { item: T; slug: string; firstIndex: number }[];
};

export function dedupeBySlug<T extends { index: number; data: ProductInput }>(
  rows: T[],
): DedupResult<T> {
  const seenSlugs = new Map<string, number>();
  const kept: T[] = [];
  const duplicates: DedupResult<T>['duplicates'] = [];

  for (const row of rows) {
    const slug = row.data.slug ?? slugify(row.data.name);
    const firstIndex = seenSlugs.get(slug);
    if (firstIndex !== undefined) {
      duplicates.push({ item: row, slug, firstIndex });
      continue;
    }
    seenSlugs.set(slug, row.index);
    kept.push(row);
  }

  return { kept, duplicates };
}

// Build the bulkWrite doc from a validated input. Slug falls back to a
// derive-from-name in case Zod's optionalText returned undefined for a
// row whose CSV slug column was blank (the coercer already derives, this
// is belt-and-suspenders for the type-level guarantee).
export function toProductDoc(parsed: ProductInput): ProductDoc {
  const slug = parsed.slug ?? slugify(parsed.name);
  const stamped = stampPricingDerivedFields({
    pricingType: parsed.pricingType,
    packagePrice: parsed.packagePrice,
    packageWeightLb: parsed.packageWeightLb,
    pricePerLb: parsed.pricePerLb,
    estimatedWeightLb: parsed.estimatedWeightLb,
    averageWeightLb: parsed.averageWeightLb,
    minWeightLb: parsed.minWeightLb,
    maxWeightLb: parsed.maxWeightLb,
    unitPrice: parsed.unitPrice,
    bundlePrice: parsed.bundlePrice,
    includedItems: parsed.includedItems,
  });

  return {
    slug,
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    cutType: parsed.cutType,
    qualityTier: parsed.qualityTier,
    pricingType: parsed.pricingType,
    packagePrice: parsed.packagePrice,
    packageWeightLb: parsed.packageWeightLb,
    pricePerLb: parsed.pricePerLb,
    estimatedWeightLb: parsed.estimatedWeightLb,
    averageWeightLb: parsed.averageWeightLb,
    minWeightLb: parsed.minWeightLb,
    maxWeightLb: parsed.maxWeightLb,
    unitPrice: parsed.unitPrice,
    bundlePrice: parsed.bundlePrice,
    includedItems: parsed.includedItems,
    stockCount: parsed.stock,
    sku: parsed.sku,
    gradeBreed: parsed.gradeBreed,
    supplier: parsed.supplier,
    parLevel: parsed.parLevel,
    reorderPoint: parsed.reorderPoint,
    isFeatured: parsed.isFeatured,
    isActive: parsed.isActive,
    isAged: parsed.isAged,
    isNewArrival: parsed.isNewArrival,
    ...stamped,
  };
}
