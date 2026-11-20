/**
 * mathjs CAS Equivalence Checker (architecture.md §8.2 Step 3, §8.3)
 * Pure verification for numeric and algebraic solutions.
 */
import * as math from 'mathjs';

/**
 * Checks numeric equivalence within tolerance.
 */
export function checkNumericEquivalence(
  expected: number,
  actual: number,
  tolerance: number = 0.01
): boolean {
  if (isNaN(expected) || isNaN(actual)) return false;
  return Math.abs(expected - actual) <= tolerance;
}

/**
 * Checks algebraic expression equivalence by evaluating at multiple random sample points.
 * e.g. "2*x + 4" is equivalent to "2*(x + 2)".
 */
export function checkAlgebraicEquivalence(
  exprA: string,
  exprB: string,
  variables: string[] = ['x', 'y']
): boolean {
  try {
    const cleanA = sanitizeExpression(exprA);
    const cleanB = sanitizeExpression(exprB);

    const compiledA = math.compile(cleanA);
    const compiledB = math.compile(cleanB);

    // Test at 3 pseudo-random sample points
    const testPoints = [
      { x: 1.73, y: 2.45 },
      { x: 4.12, y: -1.89 },
      { x: -3.56, y: 5.67 },
    ];

    for (const point of testPoints) {
      const scope: Record<string, number> = {};
      for (const v of variables) {
        scope[v] = (point as Record<string, number>)[v] ?? 2.5;
      }

      const valA = Number(compiledA.evaluate(scope));
      const valB = Number(compiledB.evaluate(scope));

      if (isNaN(valA) || isNaN(valB) || Math.abs(valA - valB) > 1e-4) {
        return false;
      }
    }

    return true;
  } catch {
    // If expression cannot be parsed by mathjs, fallback to string normalization
    return normalizeString(exprA) === normalizeString(exprB);
  }
}

function sanitizeExpression(expr: string): string {
  return expr
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\left|\\right/g, '')
    .replace(/\^\{([^}]+)\}/g, '^($1)')
    .replace(/\\/g, '')
    .trim();
}

function normalizeString(str: string): string {
  return str.replace(/\s+/g, '').toLowerCase();
}
