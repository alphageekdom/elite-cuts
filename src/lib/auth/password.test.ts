import { describe, it, expect } from 'vitest';

import {
  MIN_PASSWORD_LENGTH,
  isPasswordLengthValid,
  scorePasswordStrength,
} from './password';

describe('scorePasswordStrength', () => {
  // The regression this floor exists for. Before it, the two complexity
  // points could carry a password the form refuses: "Aa1!" scored 2 and the
  // register meter rendered "Fair" with amber bars while submit rejected it.
  it('scores 0 for a complex password below the minimum length', () => {
    expect(scorePasswordStrength('Aa1!')).toBe(0);
  });

  it('scores 0 one character below the minimum, however complex', () => {
    const justShort = `Aa1!${'x'.repeat(MIN_PASSWORD_LENGTH - 5)}`;
    expect(justShort).toHaveLength(MIN_PASSWORD_LENGTH - 1);
    expect(scorePasswordStrength(justShort)).toBe(0);
  });

  it('scores 0 for an empty password', () => {
    expect(scorePasswordStrength('')).toBe(0);
  });

  // Nothing the meter calls anything other than "Too short" may be a password
  // the form would reject — that pairing is the whole point of the floor.
  it('never scores above 0 for a password the form rejects on length', () => {
    for (let length = 0; length < MIN_PASSWORD_LENGTH; length++) {
      const candidate = 'Aa1!Bb2@Cc3#'.slice(0, length);
      expect(isPasswordLengthValid(candidate)).toBe(false);
      expect(scorePasswordStrength(candidate)).toBe(0);
    }
  });

  it('scores 1 at the minimum length with no complexity', () => {
    expect(scorePasswordStrength('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(1);
  });

  it('adds a point for mixed case', () => {
    expect(scorePasswordStrength(`Aa${'a'.repeat(MIN_PASSWORD_LENGTH - 2)}`)).toBe(2);
  });

  it('adds a point only when a digit and a symbol are both present', () => {
    const base = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    // Either alone earns nothing beyond the length point.
    expect(scorePasswordStrength(`${base}1`)).toBe(1);
    expect(scorePasswordStrength(`${base}!`)).toBe(1);
    // Both together earn it.
    expect(scorePasswordStrength(`${base.slice(1)}1!`)).toBe(2);
  });

  // The form prints "Use 8+ characters with upper & lower case, a number & a
  // symbol." A password following that sentence exactly has to reach the top
  // score, or the helper is instructing users toward a result they can't get.
  it('reaches the top score for a password matching the helper text', () => {
    const followsTheHelper = `Aa1!${'b'.repeat(MIN_PASSWORD_LENGTH - 4)}`;
    expect(followsTheHelper.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(scorePasswordStrength(followsTheHelper)).toBe(3);
  });
});
