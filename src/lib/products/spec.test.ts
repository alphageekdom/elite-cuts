import { describe, expect, it } from 'vitest';

import { getSpecCells, getSpecCut, getSpecGrade, getSpecWeight } from './spec';

describe('getSpecWeight', () => {
  it('shows a range for per_lb cuts with both bounds', () => {
    expect(
      getSpecWeight({ pricingType: 'per_lb', minWeightLb: 0.75, maxWeightLb: 1.25 }),
    ).toBe('0.75–1.25 lb');
  });

  it('collapses an equal range to a single weight', () => {
    expect(
      getSpecWeight({ pricingType: 'per_lb', minWeightLb: 1, maxWeightLb: 1 }),
    ).toBe('1 lb');
  });

  it('falls back to estimatedWeightLb when bounds are missing', () => {
    expect(getSpecWeight({ pricingType: 'per_lb', estimatedWeightLb: 0.5 })).toBe('0.5 lb');
  });

  it('falls back to averageWeightLb for whole items', () => {
    expect(
      getSpecWeight({ pricingType: 'whole_item_by_weight', averageWeightLb: 3.5 }),
    ).toBe('3.5 lb');
  });

  it('shows the fixed weight for a package', () => {
    expect(getSpecWeight({ pricingType: 'fixed_package', packageWeightLb: 1.5 })).toBe(
      '1.5 lb',
    );
  });

  it('describes how each / bundle are sold instead of leaving the cell empty', () => {
    expect(getSpecWeight({ pricingType: 'each' })).toBe('Sold each');
    expect(getSpecWeight({ pricingType: 'bundle' })).toBe('Bundle');
  });

  it('em-dashes a weighed cut with no weight data at all', () => {
    expect(getSpecWeight({ pricingType: 'per_lb' })).toBe('—');
    expect(getSpecWeight({ pricingType: 'fixed_package' })).toBe('—');
  });

  it('still reads bounds on a pre-Phase-1 product with no pricingType', () => {
    expect(getSpecWeight({ minWeightLb: 2, maxWeightLb: 3 })).toBe('2–3 lb');
    expect(getSpecWeight({})).toBe('—');
  });
});

describe('getSpecCut', () => {
  it('passes the stored cut name through', () => {
    expect(getSpecCut({ cutType: 'Tomahawk' })).toBe('Tomahawk');
  });

  it('em-dashes a blank or whitespace-only cut', () => {
    expect(getSpecCut({ cutType: '   ' })).toBe('—');
    expect(getSpecCut({})).toBe('—');
  });
});

describe('getSpecGrade', () => {
  it('maps the tier key to its display label', () => {
    expect(getSpecGrade({ qualityTier: 'prime' })).toBe('Prime');
    expect(getSpecGrade({ qualityTier: 'grass_fed' })).toBe('Grass-fed');
  });

  it('em-dashes a missing tier', () => {
    expect(getSpecGrade({})).toBe('—');
  });
});

describe('getSpecCells', () => {
  it('always returns three labelled cells so the strip never orphans one', () => {
    expect(getSpecCells({})).toEqual([
      { label: 'Weight', value: '—' },
      { label: 'Cut', value: '—' },
      { label: 'Grade', value: '—' },
    ]);
  });
});
