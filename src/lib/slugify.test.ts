import { describe, expect, it } from 'vitest';

import { slugify } from './slugify';

// `slugify` decides product identity, which makes it higher-stakes than its
// five lines suggest. Its output is the public product URL, the CSV importer's
// upsert key, and the natural key the nightly demo restore matches a seeded cut
// on. A change here silently reassigns identity: indexed URLs 404, a CSV
// re-import creates duplicates instead of updating, and the restore strands the
// row it can no longer find.
//
// It had no test of its own. The only place it appeared was
// `demo/restore.test.ts`, which calls it to compute the very key it then
// asserts against — so a regression would have passed that suite by
// construction.

describe('slugify', () => {
  it('lowercases and hyphenates a normal product name', () => {
    expect(slugify('Dry-Aged Ribeye')).toBe('dry-aged-ribeye');
    expect(slugify('Filet Mignon')).toBe('filet-mignon');
  });

  it('collapses any run of non-alphanumerics into a single hyphen', () => {
    expect(slugify('Beef  ---  Short   Ribs')).toBe('beef-short-ribs');
    expect(slugify('St. Louis / Spare Ribs')).toBe('st-louis-spare-ribs');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  Brisket  ')).toBe('brisket');
    expect(slugify('!!! Wagyu !!!')).toBe('wagyu');
  });

  it('strips accents rather than dropping the letter underneath', () => {
    // NFKD splits the accented char into base + combining mark, and only the
    // mark is removed — so the letter survives instead of becoming a hyphen.
    expect(slugify('Jamón Ibérico')).toBe('jamon-iberico');
    expect(slugify('Café de Paris Butter')).toBe('cafe-de-paris-butter');
  });

  it('keeps digits, which several cuts depend on', () => {
    expect(slugify('28 Day Aged Sirloin')).toBe('28-day-aged-sirloin');
    expect(slugify('Prime Rib 3-Bone')).toBe('prime-rib-3-bone');
  });

  it('is idempotent — slugifying a slug returns the same slug', () => {
    // The importer round-trips an exported slug back through the coercer, so a
    // second pass must not shift identity.
    const once = slugify('Dry-Aged Tomahawk');
    expect(slugify(once)).toBe(once);
  });

  it('returns an empty string when nothing survives', () => {
    // Callers guard on this: the model's hook only assigns when `name` is set,
    // and an all-punctuation name yielding '' is what keeps the partial unique
    // index (which exempts empty slugs) from rejecting the row.
    expect(slugify('')).toBe('');
    expect(slugify('---')).toBe('');
    expect(slugify('!@#$%')).toBe('');
  });
});
