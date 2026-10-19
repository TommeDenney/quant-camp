// PDF / CDF / Exceedance Explorer: pick a threshold and see the area under the PDF,
// the CDF value, the exceedance probability and the return period.
import { useMemo, useState } from 'react';
import { Area, C, Dots, Legend, Line, Plot, VLine, range } from '../components/Chart';
import { Seg, Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { gammaCdf, gammaPdf, normCdf, normPdf } from '../lib/stats';

type Fam = 'normal' | 'gamma';
interface P { fam: Fam; mu: number; sd: number; k: number; theta: number; x: number; unit: string; label: string }
const DEF: P = { fam: 'gamma', mu: 0, sd: 1, k: 4, theta: 25, x: 160, unit: 'mm', label: 'Wettest-month rainfall each year' };
export const PRESETS: Preset<P>[] = [
  { id: 'rain', label: 'Annual wettest-month rainfall (Gamma)', params: DEF },
  { id: 'heat', label: 'Summer mean temperature (Normal)', params: { fam: 'normal', mu: 24, sd: 1.2, k: 2, theta: 1, x: 26.5, unit: '°C', label: 'Summer mean temperature' } },
  { id: 'nino', label: 'Niño 3.4 anomaly (Normal)', params: { fam: 'normal', mu: 0, sd: 0.9, k: 2, theta: 1, x: 1.5, unit: '°C', label: 'Niño 3.4 SST anomaly' } },
  { id: 'std', label: 'Standard normal', params: { fam: 'normal', mu: 0, sd: 1, k: 2, theta: 1, x: 1.96, unit: 'σ', label: 'z' } },
];

export default function PdfCdfExplorer({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const pdf = (v: number) => (p.fam === 'normal' ? normPdf(v, p.mu, p.sd) : gammaPdf(v, p.k, p.theta));
  const cdf = (v: number) => (p.fam === 'normal' ? normCdf(v, p.mu, p.sd) : gammaCdf(v, p.k, p.theta));
  const lo = p.fam === 'normal' ? p.mu - 4.5 * p.sd : 0;
  const hi = p.fam === 'normal' ? p.mu + 4.5 * p.sd : p.k * p.theta + 6 * Math.sqrt(p.k) * p.theta;
  const xs = useMemo(() => range(lo, hi, 300), [lo, hi]);
  const curve = xs.map((v) => [v, pdf(v)] as [number, number]);
  const F = cdf(p.x), S = 1 - F;
  const T = S > 0 ? 1 / S : Infinity;
  const ymax = Math.max(...curve.map((c) => c[1])) * 1.12;
  const set = (k: keyof P) => (v: number) => setP({ ...p, [k]: v });
  const at10 = 1 - (1 - S) ** 10;
  return (
    <VizFrame title="PDF, CDF & Exceedance" subtitle={p.label} presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <div><Seg value={p.fam} onChange={(f) => setP(f === 'normal' ? { ...p, fam: f, x: p.mu + p.sd } : { ...p, fam: f, x: p.k * p.theta * 1.5 })} label="Distribution" options={[['normal', 'Normal (Gaussian)'], ['gamma', 'Gamma']]} /></div>
        {p.fam === 'normal' ? <>
          <Slider label="Mean μ" unit={p.unit} value={p.mu} min={-5} max={40} step={0.1} onChange={set('mu')} />
          <Slider label="Std dev σ" unit={p.unit} value={p.sd} min={0.1} max={10} step={0.05} onChange={set('sd')} />
        </> : <>
          <Slider label="Shape k" value={p.k} min={0.5} max={12} step={0.1} onChange={set('k')} />
          <Slider label="Scale θ" unit={p.unit} value={p.theta} min={1} max={60} step={0.5} onChange={set('theta')} />
        </>}
        <Slider label="Threshold x" unit={p.unit} value={p.x} min={+lo.toFixed(2)} max={+hi.toFixed(2)} step={(hi - lo) / 400} onChange={set('x')} />
      </>}
      stats={<>
        <Stat label="CDF  F(x) = P(X ≤ x)" value={F.toFixed(4)} />
        <Stat label="Exceedance  P(X > x) = 1 − F(x)" value={S.toFixed(4)} tone="warn" />
        <Stat label="Return period 1 / P(X > x)" value={isFinite(T) ? `${T < 100 ? T.toFixed(1) : Math.round(T).toLocaleString()} years` : '∞'} />
        <Stat label="Chance of ≥ 1 in 10 years" value={`${(at10 * 100).toFixed(0)}%`} />
      </>}
      explain={<>The <b>blue area</b> left of x is F(x); the <b>orange area</b> to the right is the exceedance probability. With yearly data, a {isFinite(T) ? `${T.toFixed(0)}-year` : 'very rare'} event has
        a {(S * 100).toFixed(1)}% chance <i>every</i> year. A return period is an average recurrence interval, <b>not a guaranteed waiting time</b>: it can happen two years in a row, or not for much longer.</>}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <Plot x={[lo, hi]} y={[0, ymax]} height={250} xLabel={`${p.label} (${p.unit})`} yLabel="Probability density p(x)">
            <Area pts={curve.filter(([v]) => v <= p.x)} color={C.s1} opacity={0.3} />
            <Area pts={curve.filter(([v]) => v >= p.x)} color={C.s2} opacity={0.4} />
            <Line pts={curve} color={C.ink} width={1.8} />
            <VLine x={p.x} color={C.s2} label={`x = ${+p.x.toFixed(2)}`} />
          </Plot>
        </div>
        <Plot x={[lo, hi]} y={[0, 1]} height={190} xLabel={`x (${p.unit})`} yLabel="F(x) = P(X ≤ x)">
          <Line pts={xs.map((v) => [v, cdf(v)])} color={C.s1} />
          <Dots pts={[[p.x, F]]} color={C.s1} r={5} />
        </Plot>
        <Plot x={[lo, hi]} y={[0, 1]} height={190} xLabel={`x (${p.unit})`} yLabel="P(X > x)">
          <Line pts={xs.map((v) => [v, 1 - cdf(v)])} color={C.s2} />
          <Dots pts={[[p.x, S]]} color={C.s2} r={5} />
        </Plot>
        <div className="grid content-center gap-2 text-sm">
          <Legend items={[{ label: 'P(X ≤ x): the CDF', color: 'var(--s1)', box: true }, { label: 'P(X > x): exceedance (survival function, sf)', color: 'var(--s2)', box: true }]} />
          <p className="text-muted">In Python: <code>stats.norm.cdf(x, μ, σ)</code>, <code>stats.norm.sf(x, μ, σ)</code>, or <code>stats.gamma.sf(x, k, scale=θ)</code>; return period <code>1 / sf</code>.</p>
        </div>
      </div>
    </VizFrame>
  );
}
