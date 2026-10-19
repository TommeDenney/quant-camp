// The slide's sample moments (Lecture 1–2, slide 29): sums over N − 1, standardised by σ̂ (N − 1).
// Reference values computed independently with NumPy.
import { describe, expect, it } from 'vitest';
import { profMoments } from '../../src/viz/moments';
import { kurtosis, skewness } from '../../src/lib/stats';

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('profMoments (course formula)', () => {
  it('matches NumPy for [1,2,3,4,10]', () => {
    const m = profMoments([1, 2, 3, 4, 10]);
    close(m.mean, 4);
    close(m.variance, 12.5);
    close(m.skew, 1.0182337649086284);
    close(m.kurt, 2.2304);
  });
  it('matches NumPy for a right-skewed rainfall-like sample', () => {
    const m = profMoments([12, 15, 11, 30, 14, 13, 16, 10]);
    close(m.skew, 1.7118285949487229);
    close(m.kurt, 4.441468687221591);
  });
  it('differs from scipy-style (1/N) moments, as the lesson explains', () => {
    const x = [1, 2, 3, 4, 10];
    expect(Math.abs(profMoments(x).skew - skewness(x))).toBeGreaterThan(0.05);
    expect(Math.abs(profMoments(x).kurt - kurtosis(x, { excess: false }))).toBeGreaterThan(0.05);
  });
});
