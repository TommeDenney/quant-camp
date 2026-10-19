// Bootstrap Simulator: resample WITH replacement, recompute a statistic, and read a
// confidence interval off the spread of the bootstrap distribution.
import { useMemo, useState } from 'react';
import { Bars, C, Legend, Plot, VLine, histogram } from '../components/Chart';
import { Seg, Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { gammaCdf, mean, median, quantile, rng } from '../lib/stats';

interface P { n: number; skew: number; seed: number }
const DEF: P = { n: 20, skew: 2, seed: 4 };
export const PRESETS: Preset<P>[] = [
  { id: 'rain', label: 'Monthly rainfall, 20 years (skewed)', params: DEF },
  { id: 'small', label: 'Only 8 years', params: { n: 8, skew: 2, seed: 2 } },
  { id: 'symmetric', label: 'Near-symmetric data, 30 values', params: { n: 30, skew: 12, seed: 6 } },
];
/** Gamma(k, θ) by inverting the CDF (deterministic per seed). */
function gammaSample(n: number, k: number, theta: number, seed: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const u = r();
    let lo = 0, hi = k * theta * 20;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (gammaCdf(mid, k, theta) < u) lo = mid; else hi = mid; }
    return +((lo + hi) / 2).toFixed(1);
  });
}

export default function BootstrapSim({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [stat, setStat] = useState<'mean' | 'median'>('mean');
  const [vals, setVals] = useState<number[]>([]);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [r] = useState(() => rng(123));
  const data = useMemo(() => gammaSample(p.n, p.skew, 90 / p.skew, p.seed), [p]);
  const f = stat === 'mean' ? mean : median;
  const obs = f(data);
  const run = (k: number) => {
    const out: number[] = [];
    let last: number[] = [];
    for (let i = 0; i < k; i++) { const idx = data.map(() => Math.floor(r() * data.length)); last = idx; out.push(f(idx.map((j) => data[j]))); }
    const c = new Array(data.length).fill(0);
    last.forEach((j) => c[j]++);
    setCounts(c);
    setVals((v) => [...v, ...out].slice(-20000));
  };
  const clear = () => { setVals([]); setCounts(null); };
  const lo = vals.length > 20 ? quantile(vals, 0.025) : NaN, hi = vals.length > 20 ? quantile(vals, 0.975) : NaN;
  const span: [number, number] = [Math.min(...data) * 0.5 + obs * 0.5, Math.max(...data) * 0.5 + obs * 0.5];
  const h = histogram(vals, span[0], span[1], 40);
  return (
    <VizFrame title="Bootstrap Simulator" subtitle="Uncertainty in a statistic from one sample" presets={PRESETS} onPreset={(q) => { setP(q.params); clear(); }} onReset={() => { setP(start); setStat('mean'); clear(); }}
      controls={<>
        <div className="flex flex-wrap gap-3 items-center"><Seg value={stat} onChange={(s) => { setStat(s); clear(); }} label="Statistic" options={[['mean', 'Mean'], ['median', 'Median']]} /></div>
        <Slider label="Sample size N" value={p.n} min={5} max={60} onChange={(v) => { setP({ ...p, n: v }); clear(); }} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm" onClick={() => run(1)}>One bootstrap sample</button>
          <button className="btn btn-sm" onClick={() => run(10)}>Run 10</button>
          <button className="btn btn-sm" onClick={() => run(100)}>Run 100</button>
          <button className="btn btn-sm btn-primary" onClick={() => run(1000)}>Run 1,000</button>
          <button className="btn btn-sm btn-ghost" onClick={clear}>Clear</button>
        </div>
      </>}
      stats={<>
        <Stat label={`Observed ${stat}`} value={`${obs.toFixed(1)} mm`} />
        <Stat label="Bootstrap samples" value={vals.length.toLocaleString()} />
        <Stat label="95% percentile CI" value={isFinite(lo) ? `${lo.toFixed(1)} to ${hi.toFixed(1)} mm` : 'run ≥ 20'} tone="good" />
        <Stat label="Bootstrap standard error" value={vals.length > 2 ? `${Math.sqrt(vals.reduce((a, v) => a + (v - mean(vals)) ** 2, 0) / (vals.length - 1)).toFixed(2)} mm` : '–'} />
      </>}
      explain={<>Each bootstrap sample draws N values <b>with replacement</b> from the one sample we have, so some values appear twice or more and others not at all (the badges show the last draw). The spread of the recomputed {stat}s approximates its sampling distribution;
        the middle 95% gives a <b>confidence interval</b>. A bootstrap estimates <b>uncertainty</b>; a permutation test asks whether there is a <b>difference</b> at all.</>}>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {data.map((v, j) => (
          <span key={j} className="chip" style={{ position: 'relative', opacity: counts && counts[j] === 0 ? 0.35 : 1 }}>
            {v}{counts && counts[j] > 0 && <b style={{ color: 'var(--accent)' }}> ×{counts[j]}</b>}
          </span>
        ))}
      </div>
      <Plot x={span} y={[0, h.max * 1.15]} height={240} xLabel={`Bootstrap ${stat} of rainfall (mm)`} yLabel="Number of bootstrap samples">
        <Bars data={h.bars} width={h.width} color={C.s5} opacity={0.55} />
        <VLine x={obs} color={C.bad} dash="" width={2.5} label="observed" />
        {isFinite(lo) && <><VLine x={lo} color={C.s2} label="2.5%" /><VLine x={hi} color={C.s2} label="97.5%" /></>}
      </Plot>
      <Legend items={[{ label: 'Bootstrap distribution', color: 'var(--s5)', box: true }, { label: 'Observed statistic', color: 'var(--bad)' }, { label: '95% CI bounds', color: 'var(--s2)', dash: true }]} />
    </VizFrame>
  );
}
