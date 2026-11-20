import { describe, it, expect } from 'vitest';
import {
  checkNumericEquivalence,
  checkAlgebraicEquivalence,
} from '@/modules/ai/verifier/mathjs';

describe('mathjs CAS Equivalence', () => {
  it('verifies numeric equivalence with tolerance', () => {
    expect(checkNumericEquivalence(3.14159, 3.14, 0.01)).toBe(true);
    expect(checkNumericEquivalence(100, 100)).toBe(true);
    expect(checkNumericEquivalence(100, 105, 1)).toBe(false);
  });

  it('verifies equivalent algebraic polynomials', () => {
    // 2*(x + 3) == 2*x + 6
    expect(checkAlgebraicEquivalence('2 * (x + 3)', '2*x + 6')).toBe(true);
    // (x + y)^2 == x^2 + 2*x*y + y^2
    expect(checkAlgebraicEquivalence('(x + y)^2', 'x^2 + 2*x*y + y^2')).toBe(true);
  });

  it('distinguishes non-equivalent expressions', () => {
    expect(checkAlgebraicEquivalence('x^2 + 1', 'x^2 - 1')).toBe(false);
    expect(checkAlgebraicEquivalence('2*x', '3*x')).toBe(false);
  });

  it('handles LaTeX formula representations', () => {
    // \frac{x}{2} == 0.5 * x
    expect(checkAlgebraicEquivalence('\\frac{x}{2}', '0.5 * x')).toBe(true);
  });
});
