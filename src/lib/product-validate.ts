// Single inline validator for product input — mirrors the Product schema's
// invariants so anywhere a product enters the system (CSV import row, admin
// form submission, future API endpoints) it passes through one set of rules.
// Returns either a parsed, typed payload or a row-level error string for the
// caller to surface to the admin.
//
// Kept dependency-free on purpose: the project doesn't carry Zod yet and
// adding it for a half-dozen field checks is overkill. If Zod arrives later
// for other reasons, swap this file out — the call sites only see the
// `validateProductInput(input) -> { ok, ... }` shape.

import { PRODUCT_CATEGORIES } from '@/lib/admin-constants';
import { PRODUCT_UNITS } from '@/models/Product';
import { slugify } from '@/lib/slugify';

export type ProductInput = {
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  supplier: string;
};

export type ValidateResult =
  | { ok: true; data: ProductInput }
  | { ok: false; error: string };

function parseBool(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === '') return false;
  return null;
}

// Map a FormData submission (admin form drawer) into the string record the
// validator expects. Defaults are applied for fields the form doesn't
// currently expose (slug, isFeatured/isActive — the schema's defaults still
// apply but the validator wants explicit values up front).
export function productRecordFromFormData(formData: FormData): Record<string, string> {
  return {
    slug:        String(formData.get('slug') ?? ''),
    name:        String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    category:    String(formData.get('category') ?? ''),
    price:       String(formData.get('price') ?? ''),
    unit:        String(formData.get('unit') ?? 'lb'),
    stock:       String(formData.get('stockCount') ?? formData.get('stock') ?? '0'),
    isFeatured:  String(formData.get('isFeatured') ?? 'false'),
    isActive:    String(formData.get('isActive') ?? 'true'),
    supplier:    String(formData.get('supplier') ?? ''),
  };
}

export function validateProductInput(input: Record<string, string>): ValidateResult {
  const name = input.name?.trim() ?? '';
  if (!name) return { ok: false, error: 'name is required' };
  if (name.length > 200) return { ok: false, error: 'name too long' };

  // Slug is optional on input — derived from name when missing or blank so the
  // CSV column can stay empty for new rows. Lowercased + URL-safe via slugify.
  const rawSlug = input.slug?.trim() ?? '';
  const slug = rawSlug ? slugify(rawSlug) : slugify(name);
  if (!slug) return { ok: false, error: 'slug could not be derived from name' };
  if (slug.length > 200) return { ok: false, error: 'slug too long' };

  const description = input.description?.trim() ?? '';
  if (!description) return { ok: false, error: 'description is required' };

  const category = input.category?.trim() ?? '';
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category)) {
    return { ok: false, error: `category must be one of: ${PRODUCT_CATEGORIES.join(', ')}` };
  }

  const unit = (input.unit?.trim() || 'lb').toLowerCase();
  if (!(PRODUCT_UNITS as readonly string[]).includes(unit)) {
    return { ok: false, error: `unit must be one of: ${PRODUCT_UNITS.join(', ')}` };
  }

  const priceRaw = input.price?.trim() ?? '';
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'price must be a non-negative number' };
  }

  const stockRaw = input.stock?.trim() ?? '';
  const stock = Number.parseInt(stockRaw, 10);
  if (!Number.isFinite(stock) || stock < 0 || String(stock) !== stockRaw) {
    return { ok: false, error: 'stock must be a non-negative integer' };
  }

  const isFeatured = parseBool(input.isFeatured ?? '');
  if (isFeatured === null) return { ok: false, error: 'isFeatured must be true or false' };

  const isActive = parseBool(input.isActive ?? '');
  if (isActive === null) return { ok: false, error: 'isActive must be true or false' };

  const supplier = input.supplier?.trim() ?? '';
  if (supplier.length > 200) return { ok: false, error: 'supplier too long' };

  return {
    ok: true,
    data: { slug, name, description, category, price, unit, stock, isFeatured, isActive, supplier },
  };
}
