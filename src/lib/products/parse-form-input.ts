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

function parseRequiredInt(raw: string | undefined): number | undefined {
  const trimmed = raw?.trim();
  if (trimmed === undefined || trimmed === '') return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && String(n) === trimmed ? n : undefined;
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
  const rawSlug = raw.slug?.trim() ?? '';
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

// Flatten FormData → string record. Mirrors `productRecordFromFormData`
// from the old product-validate but with every new pricing field included.
// includedItems is collected via `getAll(...)` and pipe-joined so the
// coercer's string-list parser can split it.
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
