// Reference values from SciPy / NumPy / statsmodels (computed independently).
import { describe, expect, it } from 'vitest';
import * as S from './stats';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('descriptive statistics', () => {
  const x = [2, 4, 4, 4, 5, 5, 7, 9];
  it('mean, variance, std (ddof)', () => {
    close(S.mean(x), 5);
    close(S.variance(x, 0), 4); // np.var
    close(S.variance(x, 1), 32 / 7); // np.var(ddof=1)
    close(S.std(x, 0), 2);
  });
  it('skewness and kurtosis match scipy.stats (bias=True)', () => {
    const y = [1, 2, 3, 4, 10];
    close(S.skewness(y), 1.1384200, 1e-6); // scipy.stats.skew([1,2,3,4,10])
    close(S.kurtosis(y), -0.212, 1e-6); // scipy.stats.kurtosis (excess)
    close(S.kurtosis(y, { excess: false }), 2.788, 1e-6); // Pearson
  });
  it('quantiles match numpy (linear)', () => {
    close(S.quantile([1, 2, 3, 4], 0.25), 1.75);
    close(S.median([3, 1, 2]), 2);
    close(S.iqr([1, 2, 3, 4, 5, 6, 7, 8]), 3.5);
  });
  it('shift and scale invariance of skewness', () => {
    const y = [1, 2, 3, 4, 10];
    close(S.skewness(y.map((v) => 3 * v + 7)), S.skewness(y));
    close(S.kurtosis(y.map((v) => 0.5 * v - 2)), S.kurtosis(y));
  });
});

describe('distributions', () => {
  it('normal', () => {
    close(S.normCdf(1.96), 0.9750021);
    close(S.normPpf(0.975), 1.959964, 1e-5);
    close(S.normSf(2), 0.0227501);
    close(S.normPdf(0), 0.3989423);
    close(S.normCdf(30, 25, 5), 0.8413447);
  });
  it('t', () => {
    close(S.tCdf(2, 10), 0.9633062, 1e-6);
    close(S.tPpf(0.975, 10), 2.228139, 1e-5);
    close(S.tPpf(0.975, 30), 2.042272, 1e-5);
  });
  it('F and gamma', () => {
    close(S.fPpf(0.95, 5, 10), 3.325835, 1e-4);
    close(S.gammaCdf(2, 2), 0.5939942);
    close(S.gammaCdf(10, 2, 3), 0.8454127, 1e-6);
    close(S.chi2Cdf(3.841459, 1), 0.95, 1e-6);
  });
  it('return period', () => close(S.returnPeriod(0.01), 100));
});

describe('tests', () => {
  const a = [20.1, 21.3, 19.8, 22.4, 21.0, 20.7];
  const b = [22.0, 23.1, 21.9, 24.2, 22.8, 23.5];
  it('pooled and Welch t-tests', () => {
    const t = S.ttestInd(a, b);
    close(t.t, -3.8852715, 1e-6); // scipy.stats.ttest_ind
    close(t.p, 0.0030328, 1e-6);
    const w = S.ttestWelch(a, b);
    close(w.t, -3.8852715, 1e-6);
    close(w.df, 9.9763571, 1e-6);
    close(w.p, 0.0030463, 1e-6);
  });
  it('F-test uses variances', () => {
    const f = S.fTest(a, b);
    close(f.F, S.variance(a) / S.variance(b));
    expect(f.d1).toBe(5);
  });
  it('correlations', () => {
    const x = [1, 2, 3, 4, 5], y = [2, 4, 5, 4, 5];
    close(S.pearson(x, y).r, 0.7745967);
    close(S.spearman(x, y).r, 0.7378648, 1e-6);
    close(S.spearman([1, 2, 3, 4], [1, 8, 27, 64]).r, 1);
  });
  it('ranks with ties', () => expect(S.ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]));
  it('KS statistic', () => close(S.ksStat([1, 2, 3], [4, 5, 6]), 1));
});

describe('time series', () => {
  it('acf of a known series', () => {
    const r = S.acf([1, 2, 3, 4, 5], 1);
    close(r[0], 1);
    close(r[1], 0.4); // statsmodels.tsa.stattools.acf([1,2,3,4,5], nlags=1)
  });
  it('effective sample size and bound', () => {
    close(S.effectiveN(100, 0.5), 100 / 3);
    close(S.acfBound(100), 0.196);
  });
  it('AR(1) forecast mean and variance', () => {
    const f = S.ar1Forecast(2, 0.5, 1, 1);
    close(f.mean, 1);
    close(f.variance, 1);
    close(S.ar1Forecast(2, 0.5, 1, 50).variance, 1 / 0.75, 1e-9);
  });
  it('running mean', () => {
    const m = S.runningMean([1, 2, 3, 4, 5], 3);
    expect(Number.isNaN(m[0])).toBe(true);
    close(m[2], 3);
  });
});

describe('regression', () => {
  it('OLS on an exact line', () => {
    const f = S.ols([[1], [2], [3], [4]], [3, 5, 7, 9]);
    close(f.coef[0], 1);
    close(f.coef[1], 2);
    close(f.r2, 1);
  });
  it('trend slope and CI', () => {
    const t = [0, 1, 2, 3, 4, 5], y = [0.1, 0.3, 0.2, 0.5, 0.6, 0.6];
    const tr = S.linearTrend(t, y);
    close(tr.slope, 0.1057143, 1e-6); // np.polyfit
    expect(tr.lo).toBeLessThan(tr.slope);
    expect(tr.hi).toBeGreaterThan(tr.slope);
  });
});

describe('spectral', () => {
  it('periodogram peaks at the input frequency', () => {
    const N = 64;
    const x = Array.from({ length: N }, (_, t) => Math.sin((2 * Math.PI * 8 * t) / N));
    const p = S.periodogram(x);
    const top = p.reduce((m, q) => (q.power > m.power ? q : m));
    close(top.f, 8 / 64);
  });
  it('Nyquist and aliasing', () => {
    close(S.nyquist(1), 0.5);
    close(S.aliasFrequency(0.9, 1), 0.1);
    close(S.aliasFrequency(0.3, 1), 0.3);
  });
});
