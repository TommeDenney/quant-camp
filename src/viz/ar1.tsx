// AR(1) Forecast Simulator: x_t = φ x_{t−1} + ε_t. From a starting anomaly, the
// forecast mean decays as φ^h toward the process mean (0) and its uncertainty grows
// to the long-run variance σ²/(1 − φ²).
import { useMemo, useState } from 'react';
import { Band, C, HLine, Legend, Line, Plot } from '../components/Chart';
import { Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { MathBlock } from '../components/Md';
import { ar1Forecast, rng, simulateAR1 } from '../lib/stats';

interface P { x0: number; phi: number; sigma: number; h: number; seed: number }
const DEF: P = { x0: 1.8, phi: 0.9, sigma: 0.35, h: 12, seed: 1 };
export const PRESETS: Preset<P>[] = [
  { id: 'enso', label: 'Niño 3.4 anomaly, monthly (φ ≈ 0.9)', params: DEF },
  { id: 'nyc', label: 'NYC daily Tmax anomaly (φ ≈ 0.63)', params: { x0: 4, phi: 0.63, sigma: 2.6, h: 10, seed: 3 } },
  { id: 'white', label: 'No memory (φ = 0)', params: { x0: 2, phi: 0, sigma: 1, h: 10, seed: 5 } },
  { id: 'persistent', label: 'Very persistent (φ = 0.98)', params: { x0: 2, phi: 0.98, sigma: 0.3, h: 36, seed: 7 } },
];

export default function Ar1Sim({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const past = useMemo(() => {
    const r = rng(p.seed + 11);
    const s = simulateAR1(40, p.phi, p.sigma, r, 0);
    const shift = p.x0 - s[s.length - 1];
    return s.map((v, i) => v + shift * (i / (s.length - 1)) ** 4);
  }, [p.phi, p.sigma, p.seed, p.x0]);
  const steps = Array.from({ length: p.h + 1 }, (_, h) => h);
  const fc = steps.map((h) => ar1Forecast(p.x0, p.phi, p.sigma, h));
  const paths = useMemo(() => Array.from({ length: 4 }, (_, k) => simulateAR1(p.h + 1, p.phi, p.sigma, rng(p.seed * 31 + k), p.x0)), [p]);
  const longSd = Math.abs(p.phi) < 1 ? p.sigma / Math.sqrt(1 - p.phi * p.phi) : Infinity;
  const all = [...past, ...fc.map((f) => f.mean + 2 * f.sd), ...fc.map((f) => f.mean - 2 * f.sd), ...paths.flat()].filter(isFinite);
  const yr: [number, number] = [Math.min(...all) - 0.2, Math.max(...all) + 0.2];
  const tau = p.phi > 0 && p.phi < 1 ? -1 / Math.log(p.phi) : NaN;
  const set = (k: keyof P) => (v: number) => setP({ ...p, [k]: v });
  return (
    <VizFrame title="AR(1) Forecast Simulator" subtitle="Forecast an anomaly forward from today" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="Initial anomaly x₀" unit="°C" value={p.x0} min={-4} max={4} step={0.05} onChange={set('x0')} />
        <Slider label="Coefficient φ" value={p.phi} min={-0.95} max={0.99} step={0.01} onChange={set('phi')} />
        <Slider label="Noise σ (std of ε)" unit="°C" value={p.sigma} min={0.05} max={3} step={0.05} onChange={set('sigma')} />
        <Slider label="Forecast horizon h" unit="steps" value={p.h} min={1} max={48} step={1} onChange={set('h')} />
      </>}
      stats={<>
        <Stat label={`Mean at h = ${p.h}: φʰ·x₀`} value={`${fc[p.h].mean.toFixed(3)} °C`} />
        <Stat label={`Std dev at h = ${p.h}`} value={`${fc[p.h].sd.toFixed(3)} °C`} />
        <Stat label="Long-run std σ/√(1−φ²)" value={isFinite(longSd) ? `${longSd.toFixed(3)} °C` : '∞ (not stationary)'} />
        <Stat label="e-folding time −1/ln φ" value={isFinite(tau) ? `${tau.toFixed(1)} steps` : '–'} />
      </>}
      explain={<>The forecast mean shrinks toward the process mean (0) by a factor φ each step: <b>regression toward the mean</b>. The band widens because each step adds new noise, but it levels off at the long-run variance when |φ| &lt; 1.
        Larger φ means more <b>persistence</b>: the anomaly is remembered longer and the forecast stays useful for more steps. Negative φ flips sign each step.</>}>
      <Plot x={[-40, p.h]} y={yr} height={280} xLabel="Time step (0 = now)" yLabel="Anomaly (°C)">
        <Band lo={fc.map((f, h) => [h, f.mean - 1.96 * f.sd])} hi={fc.map((f, h) => [h, f.mean + 1.96 * f.sd])} color={C.s1} opacity={0.18} />
        {paths.map((pp, k) => <Line key={k} pts={pp.map((v, h) => [h, v])} color={C.s5} width={1} opacity={0.5} />)}
        <Line pts={past.map((v, i) => [i - past.length + 1, v])} color={C.ink} width={1.6} />
        <Line pts={fc.map((f, h) => [h, f.mean])} color={C.s1} width={2.6} />
        <HLine y={0} label="process mean" />
      </Plot>
      <Legend items={[{ label: 'Observed (simulated) history', color: 'var(--ink)' }, { label: 'Forecast mean φʰx₀', color: 'var(--s1)' }, { label: '95% forecast band', color: 'var(--s1)', box: true }, { label: 'Possible futures', color: 'var(--s5)' }]} />
      <div className="grid md:grid-cols-3 gap-2 mt-2">
        <MathBlock tex={String.raw`x_t=\phi\,x_{t-1}+\varepsilon_t,\quad \varepsilon_t\sim N(0,\sigma^2)`} caption="φ: lag-1 coefficient; ε: white noise" />
        <MathBlock tex={String.raw`E[x_{t+h}\mid x_t]=\phi^{h}x_t`} caption="Conditional expectation" />
        <MathBlock tex={String.raw`\mathrm{Var}[x_{t+h}\mid x_t]=\sigma^2\frac{1-\phi^{2h}}{1-\phi^{2}}`} caption="Conditional variance → σ²/(1−φ²)" />
      </div>
    </VizFrame>
  );
}
