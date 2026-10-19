// Distribution Explorer: change the mean, spread, skewness and tail weight of a
// climate variable and watch the histogram and its moments respond.
import { useMemo, useState } from 'react';
import { Area, Bars, C, Legend, Line, Plot, histogram, range } from '../components/Chart';
import { Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { kurtosis, mean, normPdf, quantile, randn, rng, skewness, std } from '../lib/stats';

interface P { mu: number; sd: number; alpha: number; df: number; unit: string; label: string }
const DEF: P = { mu: 29, sd: 3, alpha: 0, df: 60, unit: '°C', label: 'Summer daily max temperature' };
export const PRESETS: Preset<P>[] = [
  { id: 'tmax', label: 'NYC summer Tmax (near-Gaussian)', params: DEF },
  { id: 'tmax-left', label: 'Summer Tmax with a long left tail', params: { mu: 29, sd: 3, alpha: -4, df: 60, unit: '°C', label: 'Summer daily max temperature' } },
  { id: 'rain', label: 'Daily rainfall (long right tail)', params: { mu: 8, sd: 9, alpha: 9, df: 8, unit: 'mm', label: 'Rainfall on wet days' } },
  { id: 'nino', label: 'Niño 3.4 anomaly', params: { mu: 0, sd: 0.9, alpha: 1.2, df: 60, unit: '°C', label: 'Niño 3.4 SST anomaly' } },
  { id: 'heavy', label: 'Heavy tails, symmetric', params: { mu: 0, sd: 1, alpha: 0, df: 4, unit: 'σ', label: 'Standardised anomaly' } },
];

/** A standardised sample with skewness controlled by α (skew-normal) and tails by df (t-like). */
function sample(alpha: number, df: number, n = 5000, seed = 7) {
  const r = rng(seed);
  const d = alpha / Math.sqrt(1 + alpha * alpha);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const z = d * Math.abs(randn(r)) + Math.sqrt(1 - d * d) * randn(r);
    let w = 1;
    if (df < 60) { let c = 0; for (let k = 0; k < df; k++) c += randn(r) ** 2; w = Math.sqrt(df / c); }
    out.push(z * w);
  }
  const m = mean(out), s = std(out, 0);
  return out.map((v) => (v - m) / s);
}

export default function DistributionExplorer({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const z = useMemo(() => sample(p.alpha, Math.round(p.df)), [p.alpha, p.df]);
  const x = useMemo(() => z.map((v) => p.mu + p.sd * v), [z, p.mu, p.sd]);
  const lo = p.mu - 5 * p.sd, hi = p.mu + 5 * p.sd;
  const h = useMemo(() => histogram(x, lo, hi, 60), [x, lo, hi]);
  const n = x.length;
  const dens = h.bars.map(([c, k]) => [c, k / (n * h.width)] as [number, number]);
  const gauss = range(lo, hi, 200).map((v) => [v, normPdf(v, p.mu, p.sd)] as [number, number]);
  const ymax = Math.max(...dens.map((d) => d[1]), normPdf(p.mu, p.mu, p.sd)) * 1.1;
  const sk = skewness(x), ku = kurtosis(x, { excess: false });
  const set = (k: keyof P) => (v: number) => setP({ ...p, [k]: v });
  const skewWord = Math.abs(sk) < 0.5 ? 'approximately symmetric' : Math.abs(sk) < 1 ? 'moderately skewed' : 'highly skewed';
  return (
    <VizFrame title="Distribution Explorer" subtitle={p.label} presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="Mean μ" unit={p.unit} value={p.mu} min={-10} max={40} step={0.1} onChange={set('mu')} />
        <Slider label="Standard deviation σ" unit={p.unit} value={p.sd} min={0.2} max={12} step={0.1} onChange={set('sd')} />
        <Slider label="Skewness (shape α)" value={p.alpha} min={-10} max={10} step={0.1} onChange={set('alpha')} />
        <Slider label="Tail weight (df; 60 = Gaussian tails)" value={p.df} min={3} max={60} step={1} onChange={set('df')} />
      </>}
      stats={<>
        <Stat label="Sample mean" value={`${mean(x).toFixed(2)} ${p.unit}`} />
        <Stat label="Std deviation" value={`${std(x).toFixed(2)} ${p.unit}`} />
        <Stat label="Skewness γ" value={sk.toFixed(2)} tone={Math.abs(sk) >= 1 ? 'warn' : undefined} />
        <Stat label="Kurtosis κ (Pearson)" value={ku.toFixed(2)} />
        <Stat label="Excess kurtosis κ − 3" value={(ku - 3).toFixed(2)} />
        <Stat label="Median" value={quantile(x, 0.5).toFixed(2)} />
        <Stat label="5th–95th pct" value={`${quantile(x, 0.05).toFixed(1)} to ${quantile(x, 0.95).toFixed(1)}`} />
      </>}
      explain={<>
        Moving <b>μ</b> slides the whole distribution; <b>σ</b> stretches it. Neither changes the skewness or kurtosis: those are
        <b> shift- and scale-invariant</b>. This sample is <b>{skewWord}</b> ({sk > 0 ? 'longer right tail' : sk < 0 ? 'longer left tail' : 'balanced tails'})
        {ku > 3.3 ? ', with heavier tails than a Gaussian (κ > 3).' : ku < 2.7 ? ', with lighter tails than a Gaussian (κ < 3).' : ', with roughly Gaussian tails (κ ≈ 3).'}
      </>}>
      <Plot x={[lo, hi]} y={[0, ymax]} xLabel={`${p.label} (${p.unit})`} yLabel="Probability density">
        <Bars data={dens} width={h.width} color={C.s1} opacity={0.45} />
        <Area pts={gauss} color={C.s2} opacity={0.06} />
        <Line pts={gauss} color={C.s2} width={2} dash="6 4" />
      </Plot>
      <Legend items={[{ label: `Histogram of ${n.toLocaleString()} simulated values`, color: 'var(--s1)', box: true }, { label: 'Gaussian with the same μ and σ', color: 'var(--s2)', dash: true }]} />
    </VizFrame>
  );
}
