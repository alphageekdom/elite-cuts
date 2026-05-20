import { describe, expect, it } from 'vitest';

import {
  CSV_COLUMNS,
  classifyRow,
  dedupeBySlug,
  diffParsedAgainstExisting,
  toProductDoc,
  type ExistingProductRow,
} from './import';
import type { ProductInput } from './schema';

// Build a fully-validated ProductInput by hand. The Zod schema would
// produce one with the same shape after coerceProductInput; constructing
// inline keeps the tests focused on the import helpers (not on parsing).
function input(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    name: 'Ribeye Steak',
    slug: 'ribeye-steak',
    description: 'Hand-cut ribeye, dry-aged 21 days.',
    category: 'Beef',
    cutType: 'Ribeye',
    qualityTier: 'premium',
    pricingType: 'per_lb',
    pricePerLb: 24.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.25,
    stock: 10,
    isFeatured: false,
    isActive: true,
    isAged: true,
    isNewArrival: false,
    ...overrides,
  } as ProductInput;
}

function existing(overrides: Partial<ExistingProductRow> = {}): ExistingProductRow {
  return {
    _id: { toString: () => 'id1' },
    slug: 'ribeye-steak',
    name: 'Ribeye Steak',
    description: 'Hand-cut ribeye, dry-aged 21 days.',
    category: 'Beef',
    cutType: 'Ribeye',
    qualityTier: 'premium',
    pricingType: 'per_lb',
    pricePerLb: 24.99,
    estimatedWeightLb: 1,
    minWeightLb: 0.75,
    maxWeightLb: 1.25,
    price: 24.99,
    stockCount: 10,
    isFeatured: false,
    isActive: true,
    isAged: true,
    isNewArrival: false,
    ...overrides,
  };
}

describe('CSV_COLUMNS', () => {
  it('exports the canonical column list both import and export rely on', () => {
    // Snapshot the contract so an accidental rename in one place fails
    // here loudly rather than silently breaking a round-trip.
    expect(CSV_COLUMNS).toEqual([
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
    ]);
  });
});

describe('toProductDoc', () => {
  it('stamps backcompat + display fields from canonical per_lb inputs', () => {
    const doc = toProductDoc(input());
    expect(doc.price).toBe(24.99);
    expect(doc.unit).toBe('lb');
    expect(doc.displayPriceLabel).toBe('$24.99/lb');
    expect(doc.displayWeightLabel).toBe('Approx. 0.75–1.25 lb cut');
    expect(doc.isEstimatedPrice).toBe(true);
  });

  it('renames stock → stockCount to match the Product model', () => {
    const doc = toProductDoc(input({ stock: 42 }));
    expect(doc.stockCount).toBe(42);
  });

  it('derives slug from name when the parsed slug is missing', () => {
    const doc = toProductDoc(input({ slug: undefined, name: 'New York Strip' }));
    expect(doc.slug).toBe('new-york-strip');
  });

  it('stamps fixed_package as a non-estimated cut', () => {
    const doc = toProductDoc(input({
      pricingType: 'fixed_package',
      packagePrice: 12.99,
      packageWeightLb: 1,
      // per_lb fields cleared so this doc is internally consistent
      pricePerLb: undefined,
      estimatedWeightLb: undefined,
      minWeightLb: undefined,
      maxWeightLb: undefined,
    }));
    expect(doc.price).toBe(12.99);
    expect(doc.unit).toBe('lb');
    expect(doc.displayPriceLabel).toBe('$12.99');
    expect(doc.displayWeightLabel).toBe('1 lb package');
    expect(doc.isEstimatedPrice).toBe(false);
  });
});

describe('diffParsedAgainstExisting — basic outcomes', () => {
  it('returns no diff and no warnings when nothing changed', () => {
    const { diff, warnings } = diffParsedAgainstExisting(input(), existing());
    expect(diff).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('records a single-field diff for stock changes', () => {
    const { diff } = diffParsedAgainstExisting(input({ stock: 50 }), existing({ stockCount: 10 }));
    expect(diff).toEqual([{ field: 'stock', from: 10, to: 50 }]);
  });

  it('records a per-type field diff when pricePerLb moves', () => {
    const { diff } = diffParsedAgainstExisting(
      input({ pricePerLb: 29.99 }),
      existing({ pricePerLb: 24.99, price: 24.99 }),
    );
    // pricePerLb diff is what an admin authoring the CSV cares about;
    // the importer stamps `price` separately, so no `price` diff entry.
    const fields = diff.map((d) => d.field);
    expect(fields).toContain('pricePerLb');
    expect(fields).not.toContain('price');
  });

  it('treats empty string and undefined as equal — no noisy diff', () => {
    // Mongoose's schema default writes "" for string fields the CSV
    // blanks; the diff should normalise both sides.
    const { diff } = diffParsedAgainstExisting(
      input({ supplier: undefined }),
      existing({ supplier: '' }),
    );
    expect(diff).toEqual([]);
  });

  it('compares includedItems by content, not reference', () => {
    const arr = ['bone-in ribeye', 'ground chuck'];
    const { diff } = diffParsedAgainstExisting(
      input({ includedItems: [...arr] }),
      existing({ includedItems: [...arr] }),
    );
    expect(diff).toEqual([]);

    const { diff: changed } = diffParsedAgainstExisting(
      input({ includedItems: ['bone-in ribeye', 'pork shoulder'] }),
      existing({ includedItems: arr }),
    );
    expect(changed.map((d) => d.field)).toEqual(['includedItems']);
  });
});

describe('diffParsedAgainstExisting — rename warning', () => {
  it('warns when slug matches but name moved', () => {
    const { warnings } = diffParsedAgainstExisting(
      input({ name: 'Bone-In Ribeye', slug: 'ribeye-steak' }),
      existing({ name: 'Ribeye Steak', slug: 'ribeye-steak' }),
    );
    expect(warnings.some((w) => /rename/i.test(w))).toBe(true);
  });

  it('does not warn when both slug and name change together', () => {
    const { warnings } = diffParsedAgainstExisting(
      input({ name: 'Bone-In Ribeye', slug: 'bone-in-ribeye' }),
      existing({ name: 'Ribeye Steak', slug: 'ribeye-steak' }),
    );
    expect(warnings.some((w) => /rename/i.test(w))).toBe(false);
  });
});

describe('diffParsedAgainstExisting — price-swing warning', () => {
  it('fires when per-unit cost moves more than 50%', () => {
    const { warnings } = diffParsedAgainstExisting(
      input({ pricePerLb: 100 }),
      existing({ pricePerLb: 24.99, price: 24.99 }),
    );
    expect(warnings.some((w) => /unusually large/i.test(w))).toBe(true);
  });

  it('does not fire on a moderate price change', () => {
    const { warnings } = diffParsedAgainstExisting(
      input({ pricePerLb: 27.99 }),
      existing({ pricePerLb: 24.99, price: 24.99 }),
    );
    expect(warnings.some((w) => /unusually large/i.test(w))).toBe(false);
  });

  it('compares per-unit cost across a pricingType change', () => {
    // Existing: per_lb at $24.99/lb × 1 lb estimated → $24.99 per unit
    // Parsed:   fixed_package at $26.00 per pack → $26.00 per unit
    // ~4% delta. No warning.
    const { warnings } = diffParsedAgainstExisting(
      input({
        pricingType: 'fixed_package',
        packagePrice: 26,
        packageWeightLb: 1,
        pricePerLb: undefined,
        estimatedWeightLb: undefined,
        minWeightLb: undefined,
        maxWeightLb: undefined,
      }),
      existing(),
    );
    expect(warnings.some((w) => /unusually large/i.test(w))).toBe(false);
  });

  it('falls back to existing.price for legacy docs missing pricingType', () => {
    // Legacy doc carried over from before Phase 1 — no pricingType, just a
    // flat price. The swing comparison uses that price as the per-unit
    // anchor and should still flag a 4× jump.
    const { warnings } = diffParsedAgainstExisting(
      input({ pricePerLb: 100 }),
      existing({ pricingType: undefined, pricePerLb: undefined, price: 24.99, estimatedWeightLb: undefined }),
    );
    expect(warnings.some((w) => /unusually large/i.test(w))).toBe(true);
  });
});

describe('classifyRow', () => {
  it('returns create when no existing doc matches', () => {
    expect(classifyRow(input(), undefined)).toEqual({ status: 'create' });
  });

  it('returns skip when existing matches and diff is empty', () => {
    const outcome = classifyRow(input(), existing());
    expect(outcome.status).toBe('skip');
  });

  it('returns update with the diff when a field moved', () => {
    const outcome = classifyRow(input({ stock: 50 }), existing({ stockCount: 10 }));
    expect(outcome.status).toBe('update');
    if (outcome.status === 'update') {
      expect(outcome.diff.map((d) => d.field)).toEqual(['stock']);
      expect(outcome.legacyBackfill).toBe(false);
    }
  });

  it('forces an update on a legacy doc missing slug, even with no other diff', () => {
    // Legacy doc found by name-match (no slug yet) needs the slug written
    // even when every other field already lines up.
    const outcome = classifyRow(input(), existing({ slug: undefined }));
    expect(outcome.status).toBe('update');
    if (outcome.status === 'update') {
      expect(outcome.diff).toEqual([]);
      expect(outcome.legacyBackfill).toBe(true);
    }
  });
});

describe('dedupeBySlug', () => {
  it('keeps every row when all slugs are unique', () => {
    const rows = [
      { index: 0, data: input({ slug: 'a' }) },
      { index: 1, data: input({ slug: 'b' }) },
      { index: 2, data: input({ slug: 'c' }) },
    ];
    const { kept, duplicates } = dedupeBySlug(rows);
    expect(kept).toHaveLength(3);
    expect(duplicates).toEqual([]);
  });

  it('surfaces later collisions with the first-occurrence index', () => {
    const rows = [
      { index: 0, data: input({ slug: 'ribeye' }) },
      { index: 1, data: input({ slug: 'ribeye', name: 'Other' }) },
      { index: 2, data: input({ slug: 'ribeye', name: 'Third' }) },
    ];
    const { kept, duplicates } = dedupeBySlug(rows);
    expect(kept.map((r) => r.index)).toEqual([0]);
    expect(duplicates).toHaveLength(2);
    expect(duplicates[0]).toMatchObject({ slug: 'ribeye', firstIndex: 0 });
    expect(duplicates[1]).toMatchObject({ slug: 'ribeye', firstIndex: 0 });
  });

  it('derives slug from name when the parsed slug is missing', () => {
    // Two rows with no slug but the same name → second is a dupe.
    const rows = [
      { index: 0, data: input({ slug: undefined, name: 'Ribeye Steak' }) },
      { index: 1, data: input({ slug: undefined, name: 'Ribeye Steak' }) },
    ];
    const { kept, duplicates } = dedupeBySlug(rows);
    expect(kept).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].slug).toBe('ribeye-steak');
  });
});
