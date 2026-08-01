// String → typed coercion for product form / CSV inputs. The admin form
// posts FormData, the CSV import gives a flat Record<string, string> per
// row. Both pipe through here before hitting `productInputSchema.safeParse`
// so the schema can stay typed end-to-end.

import { slugify } from '@/lib/slugify';

function parseOptionalNumber(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

// Shapes a spreadsheet legitimately writes for a count: a plain integer, one
// grouped in threes, or a decimal — each optionally signed.
//
// The grouping is checked rather than stripped, because `1,5` is a European
// decimal and `1,000` is a grouped thousand, and blind comma-removal turns the
// first into 15. These feed `stock`, `parLevel` and `reorderPoint`, so a
// silently wrong value mis-drives the storefront's out-of-stock state and the
// low-stock badge. Anything Number() would coerce by its own rules but a
// spreadsheet never emits — `0x10`, `1e3`, `Infinity` — is rejected too.
const COUNT_INPUT = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$|^-?\.\d+$/;

function parseRequiredInt(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === '') return undefined;
  if (!COUNT_INPUT.test(trimmed)) return undefined;
  // Well-formed but not necessarily whole or positive: `10.5` and `-3` pass
  // through so the schema's own `.int()` / `.nonnegative()` checks report the
  // real problem, rather than a filled-in field coming back as "required".
  const n = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

// includedItems on CSV: pipe-separated string ("ribeye|chicken|sausage").
// On the admin form: a multi-entry FormData (collected via getAll). The
// admin form caller hands us the joined string either way.
function parseStringList(raw: string | undefined): string[] | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  const items = trimmed.split('|').map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

// Build the typed input from a flat string record. Missing fields stay
// undefined so the Zod schema's `.default(...)` / required checks fire as
// designed — don't paper over missing booleans here.
export function coerceProductInput(raw: Record<string, string | undefined>): unknown {
  // Slug is derived from name when blank — both the CSV import and the
  // admin form historically allowed an empty slug column.
  //
  // Slugified BEFORE the fallback, not after: a cell of punctuation or
  // non-Latin text is non-empty here but slugifies to nothing, so testing the
  // raw string let `''` through to the schema. `bulkWrite` skips the model
  // hook that would have healed it and the unique index is partial (it ignores
  // empty strings), so the cut saved with no working URL and re-diffed as an
  // update on every later import.
  const rawSlug = slugify(raw.slug?.trim() ?? '');
  const name = raw.name?.trim() ?? '';
  const slug = rawSlug || (name ? slugify(name) : undefined);

  return {
    name,
    slug,
    description: raw.description?.trim() ?? '',
    category: raw.category?.trim() ?? '',
    cutType: raw.cutType?.trim() ?? '',
    qualityTier: raw.qualityTier?.trim() || undefined,
    pricingType: raw.pricingType?.trim() ?? '',

    packagePrice: parseOptionalNumber(raw.packagePrice),
    packageWeightLb: parseOptionalNumber(raw.packageWeightLb),
    pricePerLb: parseOptionalNumber(raw.pricePerLb),
    estimatedWeightLb: parseOptionalNumber(raw.estimatedWeightLb),
    averageWeightLb: parseOptionalNumber(raw.averageWeightLb),
    minWeightLb: parseOptionalNumber(raw.minWeightLb),
    maxWeightLb: parseOptionalNumber(raw.maxWeightLb),
    unitPrice: parseOptionalNumber(raw.unitPrice),
    bundlePrice: parseOptionalNumber(raw.bundlePrice),
    includedItems: parseStringList(raw.includedItems),

    stock: parseRequiredInt(raw.stock ?? raw.stockCount),
    sku: raw.sku?.trim() || undefined,
    gradeBreed: raw.gradeBreed?.trim() || undefined,
    supplier: raw.supplier?.trim() || undefined,
    parLevel: parseRequiredInt(raw.parLevel),
    reorderPoint: parseRequiredInt(raw.reorderPoint),

    isFeatured: parseBool(raw.isFeatured),
    isActive: raw.isActive === undefined ? undefined : parseBool(raw.isActive),
    isAged: parseBool(raw.isAged),
    isNewArrival: parseBool(raw.isNewArrival),
  };
}

// Flatten FormData → string record. includedItems is collected via
// `getAll(...)` and pipe-joined so the coercer's string-list parser can
// split it.
export function productRecordFromFormData(formData: FormData): Record<string, string | undefined> {
  const single = (key: string): string | undefined => {
    const v = formData.get(key);
    return typeof v === 'string' ? v : undefined;
  };
  const included = formData.getAll('includedItems').filter((v): v is string => typeof v === 'string');
  return {
    name: single('name'),
    slug: single('slug'),
    description: single('description'),
    category: single('category'),
    cutType: single('cutType'),
    qualityTier: single('qualityTier'),
    pricingType: single('pricingType'),
    packagePrice: single('packagePrice'),
    packageWeightLb: single('packageWeightLb'),
    pricePerLb: single('pricePerLb'),
    estimatedWeightLb: single('estimatedWeightLb'),
    averageWeightLb: single('averageWeightLb'),
    minWeightLb: single('minWeightLb'),
    maxWeightLb: single('maxWeightLb'),
    unitPrice: single('unitPrice'),
    bundlePrice: single('bundlePrice'),
    includedItems: included.length ? included.join('|') : single('includedItems'),
    stock: single('stock') ?? single('stockCount'),
    sku: single('sku'),
    gradeBreed: single('gradeBreed'),
    supplier: single('supplier'),
    parLevel: single('parLevel'),
    reorderPoint: single('reorderPoint'),
    isFeatured: single('isFeatured'),
    isActive: single('isActive'),
    isAged: single('isAged'),
    isNewArrival: single('isNewArrival'),
  };
}
