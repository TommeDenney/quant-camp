// Climate Attribution Simulator: observed temperature = Σ βᵢ · fingerprintᵢ + noise.
// Regress "observations" on model fingerprints (GHG, aerosol, natural) and judge each
// scaling factor: detected if its CI excludes 0; consistent if it includes 1.
import { useMemo, useState } from 'react';
import { C, HLine, Legend, Line, Plot, Segment, VLine, Dots } from '../components/Chart';
import { Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { acf, effectiveN, ols, randn, rng, tPpf } from '../lib/stats';

interface P { bG: number; bA: number; bN: number; noise: number; phi: number; inflate: boolean }
const DEF: P = { bG: 1, bA: 1, bN: 1, noise: 0.1, phi: 0.5, inflate: true };
export const PRESETS: Preset<P>[] = [
  { id: 'consistent', label: 'All forcings as modelled (β = 1)', params: DEF },
  { id: 'aer-weak', label: 'Model aerosols too strong (true β_aer = 0.5)', params: { ...DEF, bA: 0.5 } },
  { id: 'noisy', label: 'Large internal variability', params: { ...DEF, noise: 0.3, phi: 0.7 } },
  { id: 'nonat', label: 'No natural signal in observations', params: { ...DEF, bN: 0 } },
];
const YEARS = Array.from({ length: 70 }, (_, i) => 1951 + i);
// Simplified fingerprints (°C): GHG warming accelerates, aerosols cool (levelling off), natural = volcanic dips + solar cycle.
const GHG = YEARS.map((y) => 0.012 * (y - 1951) + 0.00012 * (y - 1951) ** 2);
const AER = YEARS.map((y) => -0.35 * (1 - Math.exp(-(y - 1951) / 25)) + 0.002 * Math.max(0, y - 1990));
const NAT = YEARS.map((y) => -0.25 * Math.exp(-(((y - 1963) / 1.4) ** 2)) - 0.2 * Math.exp(-(((y - 1982.5) / 1.2) ** 2)) - 0.3 * Math.exp(-(((y - 1991.5) / 1.3) ** 2)) + 0.04 * Math.sin((2 * Math.PI * (y - 1957)) / 11));

export default function AttributionSim({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const obs = useMemo(() => {
    const r = rng(31);
    let e = 0;
    return YEARS.map((_, i) => { e = p.phi * e + p.noise * randn(r); return p.bG * GHG[i] + p.bA * AER[i] + p.bN * NAT[i] + e; });
  }, [p.bG, p.bA, p.bN, p.noise, p.phi]);
  const X = YEARS.map((_, i) => [GHG[i], AER[i], NAT[i]]);
  const fit = ols(X, obs);
  const r1 = acf(fit.resid, 1)[1];
  const n = YEARS.length;
  const neff = p.inflate ? effectiveN(n, Math.max(0, r1)) : n;
  const df = Math.max(2, neff - 4);
  const tc = tPpf(0.975, df);
  const infl = Math.sqrt((n - 4) / df);
  const names = ['Greenhouse gases', 'Aerosols', 'Natural (volcanic + solar)'];
  const colors = [C.bad, C.s1, C.s3];
  const est = [1, 2, 3].map((j, k) => {
    const b = fit.coef[j], se = fit.se[j] * infl;
    const lo = b - tc * se, hi = b + tc * se;
    return { name: names[k], b, lo, hi, detected: lo > 0 || hi < 0, consistent: lo <= 1 && hi >= 1, color: colors[k] };
  });
  const set = (k: keyof P) => (v: number | boolean) => setP({ ...p, [k]: v });
  return (
    <VizFrame title="Climate Attribution Simulator" subtitle="Fingerprint regression: obs = β_ghg·GHG + β_aer·AER + β_nat·NAT + ε" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="True β for GHG in the 'observations'" value={p.bG} min={0} max={2} step={0.05} onChange={(v) => set('bG')(v)} />
        <Slider label="True β for aerosols" value={p.bA} min={0} max={2} step={0.05} onChange={(v) => set('bA')(v)} />
        <Slider label="True β for natural forcing" value={p.bN} min={0} max={2} step={0.05} onChange={(v) => set('bN')(v)} />
        <Slider label="Internal variability σ" unit="°C" value={p.noise} min={0.02} max={0.4} step={0.01} onChange={(v) => set('noise')(v)} />
        <Slider label="Residual autocorrelation" value={p.phi} min={0} max={0.9} step={0.01} onChange={(v) => set('phi')(v)} />
        <Toggle label="Widen CIs for autocorrelated residuals (effective N)" checked={p.inflate} onChange={(v) => set('inflate')(v)} />
      </>}
      stats={<>{est.map((e) => (
        <Stat key={e.name} label={e.name} value={`β̂ = ${e.b.toFixed(2)} [${e.lo.toFixed(2)}, ${e.hi.toFixed(2)}] · ${e.detected ? 'detected' : 'not detected'} · ${e.consistent ? 'consistent' : 'inconsistent'}`} tone={e.detected && e.consistent ? 'good' : e.detected ? 'warn' : 'bad'} />
      ))}<Stat label="Residual r₁ / effective N" value={`${r1.toFixed(2)} / ${neff.toFixed(0)} of ${n}`} /></>}
      explain={<>Each scaling factor β says how much the model's fingerprint must be stretched to match the observations. <b>Detected</b>: the 95% CI excludes 0 (the signal is really there). <b>Consistent</b>: the CI includes 1 (the model's amplitude is right).
        A CI that is wide enough to include both 0 and 1 means uncertainty prevents a firm conclusion. Autocorrelated residuals reduce the effective sample size, so the honest CIs are wider. (A simplified version of the framework: real studies also account for noise in the model fingerprints.)</>}>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Plot x={[1951, 2020]} y={[-0.8, 1.6]} height={260} xLabel="Year" yLabel="Temperature anomaly (°C)">
            <Dots pts={YEARS.map((y, i) => [y, obs[i]])} color={C.muted} r={2.4} />
            <Line pts={YEARS.map((y, i) => [y, fit.fitted[i]])} color={C.ink} width={2} />
            <Line pts={YEARS.map((y, i) => [y, fit.coef[1] * GHG[i]])} color={C.bad} width={1.6} dash="6 3" />
            <Line pts={YEARS.map((y, i) => [y, fit.coef[2] * AER[i]])} color={C.s1} width={1.6} dash="6 3" />
            <Line pts={YEARS.map((y, i) => [y, fit.coef[3] * NAT[i]])} color={C.s3} width={1.6} dash="6 3" />
            <HLine y={0} />
          </Plot>
          <Legend items={[{ label: '“Observations”', color: 'var(--muted)', box: true }, { label: 'Fitted total', color: 'var(--ink)' }, { label: 'Attributable to GHG', color: 'var(--bad)', dash: true }, { label: 'Aerosols', color: 'var(--s1)', dash: true }, { label: 'Natural', color: 'var(--s3)', dash: true }]} />
        </div>
        <div className="lg:col-span-2">
          <Plot x={[-1, 3]} y={[0.4, 3.6]} height={260} xLabel="Scaling factor β (95% CI)" yTicks={[]}>
            <VLine x={0} color={C.muted} label="0" />
            <VLine x={1} color={C.good} label="1" />
            {est.map((e, k) => <g key={e.name}>
              <Segment a={[Math.max(-1, e.lo), 3 - k]} b={[Math.min(3, e.hi), 3 - k]} color={e.color} width={4} />
              <Dots pts={[[e.b, 3 - k]]} color={e.color} r={6} />
            </g>)}
          </Plot>
          <div className="text-xs text-muted grid gap-0.5">{est.map((e) => <span key={e.name}><b style={{ color: e.color }}>●</b> {e.name}</span>)}</div>
        </div>
      </div>
    </VizFrame>
  );
}
