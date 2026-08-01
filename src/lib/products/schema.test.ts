import { describe, expect, it } from 'vitest';

import { coerceProductInput } from './parse-form-input';
import { productInputSchema } from './schema';

// Nothing referenced `productInputSchema` from a test before this file, so the
// slug normalisation below — the fix for a CSV import that classified
// `Ribeye-Steak` as a create, hit the unique index and aborted the whole
// ordered bulkWrite with a bare 500 — could have been deleted with the suite
// still green. Both entry points (the admin form and the CSV importer) run
// their raw strings through `coerceProductInput` and then this schema, so the
// two are exercised together here in the order the routes use them.

const VALID: Record<string, string> = {
  name: 'Ribeye Steak',
  description: 'Dry-aged, richly marbled.',
  category: 'Beef',
  cutType: 'Steak',
  pricingType: 'fixed_package',
  packagePrice: '24.99',
  packageWeightLb: '1',
  stock: '12',
};

const parse = (over: Record<string, string | undefined> = {}) =>
  productInputSchema.safeParse(coerceProductInput({ ...VALID, ...over }));

const firstIssue = (result: ReturnType<typeof parse>, path: string) =>
  result.success
    ? undefined
    : result.error.issues.find((i) => i.path[0] === path)?.message;

describe('slug normalisation', () => {
  it('lower-cases a hand-typed slug', () => {
    // The model declares `lowercase: true`, which Mongoose applies on insert
    // AND on filter casting — so `Ribeye-Steak` found the right document in the
    // database but missed the in-memory map keyed on the stored value, and the
    // row was misclassified as a create.
    const result = parse({ slug: 'Ribeye-Steak' });
    expect(result.success && result.data.slug).toBe('ribeye-steak');
  });

  it('is idempotent on an already-clean slug', () => {
    // Export writes clean slugs, so an export → import round trip must not
    // rewrite them.
    const result = parse({ slug: 'dry-aged-ribeye' });
    expect(result.success && result.data.slug).toBe('dry-aged-ribeye');
  });

  it('normalises spacing and punctuation the same way the model would', () => {
    const result = parse({ slug: 'Tomahawk  Chop!' });
    expect(result.success && result.data.slug).toBe('tomahawk-chop');
  });

  it('derives one from the name when the column is omitted', () => {
    const result = parse();
    expect(result.success && result.data.slug).toBe('ribeye-steak');
  });

  it('falls back to the name when the given slug slugifies to nothing', () => {
    // A punctuation-only or non-Latin cell is non-empty as typed but empty
    // once slugified. That empty string used to reach the database: the
    // importer's `?? slugify(name)` fallback does not fire on `''`, the
    // bulkWrite path skips the model hook that would have healed it, and the
    // unique index ignores empty strings so nothing collided. The cut saved
    // with no working URL and re-diffed as an update forever after.
    for (const junk of ['•••', '日本語', '---', '!!!']) {
      const result = parse({ slug: junk });
      expect(result.success && result.data.slug).toBe('ribeye-steak');
    }
  });
});

describe('whole-number coercion reports the real problem', () => {
  it('says a decimal is not a whole number rather than "required"', () => {
    // The old parser rejected anything `parseInt` could not round-trip and
    // returned undefined, so a filled-in field reported back as missing and the
    // admin had no idea what was actually wrong with it.
    expect(firstIssue(parse({ stock: '10.5' }), 'stock')).toMatch(/whole number/i);
  });

  it('accepts a leading zero as the number it plainly means', () => {
    const result = parse({ stock: '07' });
    expect(result.success && result.data.stock).toBe(7);
  });

  it('accepts a thousands separator', () => {
    const result = parse({ stock: '1,000' });
    expect(result.success && result.data.stock).toBe(1000);
  });

  it('still reports genuine nonsense as required', () => {
    expect(firstIssue(parse({ stock: 'lots' }), 'stock')).toMatch(/required/i);
    expect(firstIssue(parse({ stock: '' }), 'stock')).toMatch(/required/i);
  });

  it('rejects a negative count', () => {
    expect(firstIssue(parse({ stock: '-3' }), 'stock')).toBeDefined();
  });

  // A first attempt at the friendlier error message widened this to a bare
  // `Number(s.replace(/,/g, ''))`, which quietly accepted all of the below —
  // `1,5` (a European decimal) stored 15, `0x10` stored 16, `1e3` stored 1000.
  // These three fields are `stock`, `parLevel` and `reorderPoint`, so a wrong
  // value here mis-drives the storefront's out-of-stock state and the sidebar
  // low-stock badge, and the import preview shows a plausible-looking diff.
  it.each([
    ['1,5', 'a European decimal, not a grouped thousand'],
    ['1,2,3', 'malformed grouping'],
    ['1,00', 'a short group'],
    ['12,3456', 'an over-long group'],
    ['0x10', 'hexadecimal'],
    ['1e3', 'exponent notation'],
    ['Infinity', 'a non-finite literal'],
  ])('refuses to guess at %s (%s)', (value) => {
    expect(parse({ stock: value }).success).toBe(false);
  });

  it('still accepts a genuinely grouped thousand', () => {
    const result = parse({ stock: '12,345' });
    expect(result.success && result.data.stock).toBe(12345);
  });
});

describe('per-pricingType requirements', () => {
  it('accepts a complete fixed-package cut', () => {
    expect(parse().success).toBe(true);
  });

  it('names the field the chosen pricing type is missing', () => {
    const result = parse({ pricingType: 'per_lb', packagePrice: undefined });
    expect(firstIssue(result, 'pricePerLb')).toMatch(/per lb pricing/i);
  });
});
