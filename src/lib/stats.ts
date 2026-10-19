// Statistics used by the lessons, simulators and numeric questions. Everything is
// computed here (no hard-coded "results"); unit tests check it against SciPy values.

// ---- Random numbers (seeded, so simulations can be replayed) ----------------------
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randn(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// ---- Descriptive statistics --------------------------------------------------------
export const sum = (x: number[]) => x.reduce((a, b) => a + b, 0);
export const mean = (x: number[]) => sum(x) / x.length;
/** Variance. ddof = 1 gives the sample variance (divide by N − 1), ddof = 0 the population variance. */
export function variance(x: number[], ddof = 1) {
  const m = mean(x);
  return sum(x.map((v) => (v - m) ** 2)) / (x.length - ddof);
}
export const std = (x: number[], ddof = 1) => Math.sqrt(variance(x, ddof));
/** k-th central moment: average of (x − mean)^k (population form). */
export function centralMoment(x: number[], k: number) {
  const m = mean(x);
  return mean(x.map((v) => (v - m) ** k));
}
/** Skewness: the third central moment divided by σ³ (scipy.stats.skew, bias=True). */
export const skewness = (x: number[]) => centralMoment(x, 3) / centralMoment(x, 2) ** 1.5;
/** Kurtosis: the fourth central moment divided by σ⁴. Pearson (normal = 3) or excess (normal = 0, scipy default). */
export function kurtosis(x: number[], { excess = true } = {}) {
  const k = centralMoment(x, 4) / centralMoment(x, 2) ** 2;
  return excess ? k - 3 : k;
}
/** Quantile with linear interpolation between order statistics (numpy's default). */
export function quantile(x: number[], q: number) {
  const s = [...x].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
export const median = (x: number[]) => quantile(x, 0.5);
export const iqr = (x: number[]) => quantile(x, 0.75) - quantile(x, 0.25);
export function standardize(x: number[]) {
  const m = mean(x);
  const s = std(x, 0);
  return x.map((v) => (v - m) / s);
}

// ---- Special functions -----------------------------------------------------------------
/** log Γ(x), Lanczos approximation (accurate to ~1e-14 for x > 0). */
export function lgamma(x: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
export function erf(x: number) {
  // Abramowitz–Stegun 7.1.26 is only ~1e-7; use the series / continued fraction via gammainc for accuracy.
  const s = Math.sign(x);
  return s * gammaincLower(0.5, x * x);
}
/** Regularized lower incomplete gamma P(a, x). */
export function gammaincLower(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sumv = 1 / a, term = 1 / a;
    for (let n = 1; n < 500; n++) { term *= x / (a + n); sumv += term; if (Math.abs(term) < Math.abs(sumv) * 1e-15) break; }
    return sumv * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  return 1 - gammaincUpperCF(a, x);
}
function gammaincUpperCF(a: number, x: number) {
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
/** Regularized incomplete beta I_x(a, b). */
export function betainc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(x, a, b)) / a;
  return 1 - (bt * betacf(1 - x, b, a)) / b;
}
function betacf(x: number, a: number, b: number) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}
/** Solve f(x) = target for increasing f by bisection. */
function invert(f: (x: number) => number, target: number, lo: number, hi: number) {
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---- Distributions ----------------------------------------------------------------------
export const normPdf = (x: number, mu = 0, sigma = 1) => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
export const normCdf = (x: number, mu = 0, sigma = 1) => 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
/** Survival function = 1 − CDF = the exceedance probability P(X > x). */
export const normSf = (x: number, mu = 0, sigma = 1) => normCdf(-x, -mu, sigma);
export const normPpf = (p: number, mu = 0, sigma = 1) => mu + sigma * invert((z) => normCdf(z), p, -40, 40);

export function tPdf(x: number, df: number) {
  return Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
}
export function tCdf(x: number, df: number) {
  const ib = betainc(df / (df + x * x), df / 2, 0.5);
  return x >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}
export const tSf = (x: number, df: number) => tCdf(-x, df);
export const tPpf = (p: number, df: number) => invert((t) => tCdf(t, df), p, -1e3, 1e3);

export const fCdf = (x: number, d1: number, d2: number) => (x <= 0 ? 0 : betainc((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2));
export const fSf = (x: number, d1: number, d2: number) => 1 - fCdf(x, d1, d2);
export const fPpf = (p: number, d1: number, d2: number) => invert((x) => fCdf(x, d1, d2), p, 0, 1e4);

/** Gamma distribution with shape a and scale θ (scipy.stats.gamma(a, scale=θ)). */
export const gammaPdf = (x: number, a: number, scale = 1) => (x <= 0 ? 0 : Math.exp((a - 1) * Math.log(x / scale) - x / scale - lgamma(a)) / scale);
export const gammaCdf = (x: number, a: number, scale = 1) => gammaincLower(a, x / scale);
export const gammaSf = (x: number, a: number, scale = 1) => 1 - gammaCdf(x, a, scale);
export const chi2Cdf = (x: number, k: number) => gammaincLower(k / 2, x / 2);

/** Return period (in time steps, e.g. years) for an event with exceedance probability p per step. */
export const returnPeriod = (p: number) => 1 / p;

// ---- Hypothesis tests -------------------------------------------------------------------
export type Tails = 'two' | 'greater' | 'less';
function pFromT(t: number, df: number, tails: Tails) {
  if (tails === 'greater') return tSf(t, df);
  if (tails === 'less') return tCdf(t, df);
  return 2 * tSf(Math.abs(t), df);
}
/** Student's two-sample t-test with pooled variance (scipy.stats.ttest_ind, equal_var=True). */
export function ttestInd(a: number[], b: number[], tails: Tails = 'two') {
  const na = a.length, nb = b.length;
  const sp2 = ((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2);
  const t = (mean(a) - mean(b)) / Math.sqrt(sp2 * (1 / na + 1 / nb));
  const df = na + nb - 2;
  return { t, df, p: pFromT(t, df, tails) };
}
/** Welch's t-test (equal_var=False) with the Welch–Satterthwaite degrees of freedom. */
export function ttestWelch(a: number[], b: number[], tails: Tails = 'two') {
  const va = variance(a) / a.length, vb = variance(b) / b.length;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  return { t, df, p: pFromT(t, df, tails) };
}
/** Classical F-test for equal variances: F = s₁² / s₂² (variances, not standard deviations). */
export function fTest(a: number[], b: number[]) {
  const F = variance(a) / variance(b);
  const d1 = a.length - 1, d2 = b.length - 1;
  const p = 2 * Math.min(fCdf(F, d1, d2), fSf(F, d1, d2));
  return { F, d1, d2, p: Math.min(1, p) };
}
/** Average ranks (ties share the mean rank), 1-based. */
export function ranks(x: number[]) {
  const idx = x.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
  const r = new Array(x.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r as number[];
}
export function pearson(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const r = sxy / Math.sqrt(sxx * syy);
  const n = x.length;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  return { r, p: pFromT(t, n - 2, 'two') };
}
/** Spearman's ρ: Pearson correlation of the ranks (monotonic association). */
export const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));
/** Wilcoxon rank-sum statistic and normal-approximation p-value (no continuity correction). */
export function rankSum(a: number[], b: number[]) {
  const r = ranks([...a, ...b]);
  const W = sum(r.slice(0, a.length));
  const n1 = a.length, n2 = b.length;
  const mu = (n1 * (n1 + n2 + 1)) / 2;
  const sd = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (W - mu) / sd;
  return { W, z, p: 2 * normSf(Math.abs(z)) };
}
/** Two-sample Kolmogorov–Smirnov statistic D (largest gap between the empirical CDFs). */
export function ksStat(a: number[], b: number[]) {
  const xs = [...a, ...b].sort((p, q) => p - q);
  const ecdf = (s: number[], v: number) => s.filter((q) => q <= v).length / s.length;
  return Math.max(...xs.map((v) => Math.abs(ecdf(a, v) - ecdf(b, v))));
}

// ---- Resampling -------------------------------------------------------------------------
/** Shuffle (Fisher–Yates): sampling WITHOUT replacement. */
export function shuffle<T>(x: T[], rand: () => number) {
  const y = [...x];
  for (let i = y.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [y[i], y[j]] = [y[j], y[i]]; }
  return y;
}
/** Resample WITH replacement (a bootstrap sample of the same size). */
export const resample = <T,>(x: T[], rand: () => number) => x.map(() => x[Math.floor(rand() * x.length)]);
/** Permutation null distribution of the difference in means. */
export function permutationTest(a: number[], b: number[], n: number, rand: () => number) {
  const obs = mean(a) - mean(b);
  const pool = [...a, ...b];
  const diffs: number[] = [];
  for (let k = 0; k < n; k++) { const s = shuffle(pool, rand); diffs.push(mean(s.slice(0, a.length)) - mean(s.slice(a.length))); }
  const extreme = diffs.filter((d) => Math.abs(d) >= Math.abs(obs) - 1e-12).length;
  return { obs, diffs, p: (extreme + 1) / (n + 1) };
}
export function bootstrap(x: number[], stat: (s: number[]) => number, n: number, rand: () => number) {
  const vals: number[] = [];
  for (let k = 0; k < n; k++) vals.push(stat(resample(x, rand)));
  return { vals, lo: quantile(vals, 0.025), hi: quantile(vals, 0.975) };
}

// ---- Time series ---------------------------------------------------------------------------
/** Sample autocorrelation at lags 0…maxLag (statsmodels acf, default biased estimator). */
export function acf(x: number[], maxLag: number) {
  const m = mean(x);
  const d = x.map((v) => v - m);
  const c0 = sum(d.map((v) => v * v));
  const out: number[] = [];
  for (let k = 0; k <= maxLag; k++) { let s = 0; for (let t = k; t < d.length; t++) s += d[t] * d[t - k]; out.push(s / c0); }
  return out;
}
/** Approximate 95% significance bound for a sample autocorrelation of white noise: ±1.96/√N. */
export const acfBound = (N: number) => 1.96 / Math.sqrt(N);
/** Effective sample size for an AR(1)-like series: N(1 − r₁)/(1 + r₁). */
export const effectiveN = (N: number, r1: number) => (N * (1 - r1)) / (1 + r1);
/** AR(1): x_t = φ x_{t−1} + ε_t with ε ~ N(0, σ²). */
export function simulateAR1(n: number, phi: number, sigma: number, rand: () => number, x0 = 0) {
  const x = [x0];
  for (let t = 1; t < n; t++) x.push(phi * x[t - 1] + sigma * randn(rand));
  return x;
}
/** AR(1) forecast from x0 (process mean 0): mean φ^h x0, variance σ²(1 − φ^{2h})/(1 − φ²). */
export function ar1Forecast(x0: number, phi: number, sigma: number, h: number) {
  const m = phi ** h * x0;
  const v = Math.abs(phi) === 1 ? sigma ** 2 * h : (sigma ** 2 * (1 - phi ** (2 * h))) / (1 - phi ** 2);
  return { mean: m, variance: v, sd: Math.sqrt(v) };
}
/** Centered running mean with an odd window; ends are NaN (as with a 'valid' convolution). */
export function runningMean(x: number[], w: number) {
  const half = Math.floor(w / 2);
  return x.map((_, i) => (i < half || i >= x.length - half ? NaN : mean(x.slice(i - half, i + half + 1))));
}

// ---- Regression ------------------------------------------------------------------------------
/** Solve the small linear system A b = y (Gaussian elimination with partial pivoting). */
function solve(A: number[][], y: number[]) {
  const n = A.length;
  const M = A.map((r, i) => [...r, y[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / M[i][i]);
}
/** Ordinary least squares with an intercept: y = b0 + b1 x1 + … (X has one row per observation). */
export function ols(X: number[][], y: number[]) {
  const n = y.length;
  const D = X.map((r) => [1, ...r]);
  const p = D[0].length;
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => sum(D.map((r) => r[i] * r[j]))));
  const Xty = Array.from({ length: p }, (_, i) => sum(D.map((r, k) => r[i] * y[k])));
  const coef = solve(XtX, Xty);
  const fitted = D.map((r) => sum(r.map((v, i) => v * coef[i])));
  const resid = y.map((v, i) => v - fitted[i]);
  const sse = sum(resid.map((e) => e * e));
  const sst = sum(y.map((v) => (v - mean(y)) ** 2));
  const r2 = 1 - sse / sst;
  const k = p - 1;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / (n - k - 1);
  const rmse = Math.sqrt(sse / n);
  // Standard errors: sqrt(diag(σ̂² (XᵀX)⁻¹)), σ̂² = SSE / (n − p).
  const s2 = sse / (n - p);
  const inv = Array.from({ length: p }, (_, j) => solve(XtX, Array.from({ length: p }, (_, i) => (i === j ? 1 : 0))));
  const se = inv.map((col, j) => Math.sqrt(s2 * col[j]));
  return { coef, fitted, resid, sse, sst, r2, adjR2, rmse, se, df: n - p };
}
/** Simple linear trend y = a + b t with the slope's 95% confidence interval. */
export function linearTrend(t: number[], y: number[], level = 0.95) {
  const fit = ols(t.map((v) => [v]), y);
  const tc = tPpf(1 - (1 - level) / 2, fit.df);
  return { intercept: fit.coef[0], slope: fit.coef[1], se: fit.se[1], lo: fit.coef[1] - tc * fit.se[1], hi: fit.coef[1] + tc * fit.se[1], r2: fit.r2, resid: fit.resid };
}

// ---- Spectral analysis ---------------------------------------------------------------------
/** Periodogram |X_k|²/N at frequencies k/(N·dt), k = 0…N/2 (cycles per unit time). */
export function periodogram(x: number[], dt = 1) {
  const N = x.length;
  const m = mean(x);
  const out: { f: number; power: number }[] = [];
  for (let k = 0; k <= Math.floor(N / 2); k++) {
    let re = 0, im = 0;
    for (let t = 0; t < N; t++) { const a = (2 * Math.PI * k * t) / N; re += (x[t] - m) * Math.cos(a); im -= (x[t] - m) * Math.sin(a); }
    out.push({ f: k / (N * dt), power: (re * re + im * im) / N });
  }
  return out;
}
/** Nyquist frequency: half the sampling rate, the highest frequency a sampled series can show. */
export const nyquist = (dt: number) => 1 / (2 * dt);
/** The frequency a sine of frequency f appears at when sampled every dt (folding about Nyquist). */
export function aliasFrequency(f: number, dt: number) {
  const fs = 1 / dt;
  const r = ((f % fs) + fs) % fs;
  return r > fs / 2 ? fs - r : r;
}
