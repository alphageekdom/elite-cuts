import { describe, expect, it } from 'vitest';

import {
  FOUNDED_YEAR,
  foundingYearsLabel,
  yearsSinceFounding,
} from './founding';

const atYear = (year: number) => new Date(`${year}-06-15T12:00:00.000Z`);

describe('yearsSinceFounding', () => {
  it('counts whole years from the founding year', () => {
    expect(yearsSinceFounding(atYear(FOUNDED_YEAR))).toBe(0);
    expect(yearsSinceFounding(atYear(2026))).toBe(8);
    expect(yearsSinceFounding(atYear(2027))).toBe(9);
  });

  it('floors at zero rather than reporting negative years', () => {
    expect(yearsSinceFounding(atYear(FOUNDED_YEAR - 3))).toBe(0);
  });

  it('waits for the anniversary month before counting the year', () => {
    // The shop opened in March 2018, so on New Year's Day 2026 it has been
    // open seven years — the eighth only lands that March. Mid-month dates
    // keep the assertion stable regardless of the runner's timezone.
    expect(yearsSinceFounding(new Date('2026-01-15T12:00:00.000Z'))).toBe(7);
    expect(yearsSinceFounding(new Date('2026-02-15T12:00:00.000Z'))).toBe(7);
    expect(yearsSinceFounding(new Date('2026-03-15T12:00:00.000Z'))).toBe(8);
  });
});

describe('foundingYearsLabel', () => {
  it('spells the count for editorial copy', () => {
    expect(foundingYearsLabel(atYear(2026))).toBe('Eight years');
    expect(foundingYearsLabel(atYear(2025))).toBe('Seven years');
  });

  it('singularises one year', () => {
    expect(foundingYearsLabel(atYear(FOUNDED_YEAR + 1))).toBe('One year');
  });

  it('rolls over to the next word instead of going stale', () => {
    // The whole point of the helper: 2027 must not still read "Eight years".
    expect(foundingYearsLabel(atYear(2027))).toBe('Nine years');
    expect(foundingYearsLabel(atYear(2030))).toBe('Twelve years');
  });

  it('does not claim the new year before the anniversary', () => {
    expect(foundingYearsLabel(new Date('2026-02-15T12:00:00.000Z'))).toBe(
      'Seven years',
    );
    expect(foundingYearsLabel(new Date('2026-03-15T12:00:00.000Z'))).toBe(
      'Eight years',
    );
  });

  it('falls back to digits past the spelled range', () => {
    expect(foundingYearsLabel(atYear(FOUNDED_YEAR + 21))).toBe('21 years');
  });
});
