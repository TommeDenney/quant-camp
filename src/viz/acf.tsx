// Autocorrelation Laboratory: a synthetic monthly temperature anomaly series with
// adjustable persistence (lag-1 φ), noise, trend and seasonality, its ACF with the
// ±1.96/√N band, and the effective sample size.
import { useMemo, useState } from 'react';
import { Bars, C, HLine, Legend, Line, Plot } from '../components/Chart';
import { Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { acf, acfBound, effectiveN, randn, rng } from '../lib/stats';

interface P { n: number; phi: number; noise: number; trend: number; season: number; seed: number }
const DEF: P = { n: 240, phi: 0.6, noise: 0.8, trend: 0, season: 0, seed: 2 };
export const PRESETS: Preset<P>[] = [
  { id: 'nyc', label: 'NYC Tmax anomaly-like (φ ≈ 0.63)', params: { n: 240, phi: 0.63, noise: 1, trend: 0, season: 0, seed: 2 } },
  { id: 'white', label: 'White noise (φ = 0)', params: { n: 240, phi: 0, noise: 1, trend: 0, season: 0, seed: 4 } },
  { id: 'enso', label: 'Strong persistence (φ = 0.9)', params: { n: 360, phi: 0.9, noise: 0.5, trend: 0, season: 0, seed: 6 } },
  { id: 'trend', label: 'Warming trend, not removed', params: { n: 360, phi: 0.3, noise: 0.6, trend: 0.3, season: 0, seed: 8 } },
  { id: 'season', label: 'Seasonal cycle left in', params: { n: 240, phi: 0.2, noise: 0.6, trend: 0, season: 4, seed: 9 } },
];

export default function AcfLab({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [showTrend, setShowTrend] = useState(true);
  const x = useMemo(() => {
    const r = rng(p.seed);
    const out: number[] = [];
    let e = 0;
    for (let t = 0; t < p.n; t++) {
      e = p.phi * e + p.noise * Math.sqrt(1 - p.phi * p.phi) * randn(r); // keeps the noise variance ≈ noise²
      out.push(e + (showTrend ? (p.trend / 120) * t : 0) + p.season * Math.cos((2 * Math.PI * t) / 12));
    }
    return out;
  }, [p, showTrend]);
  const maxLag = 36;
  const r = acf(x, maxLag);
  const band = acfBound(p.n);
  const r1 = r[1];
  const neff = effectiveN(p.n, Math.max(0, r1));
  const firstInside = r.findIndex((v, k) => k > 0 && Math.abs(v) < band);
  const set = (k: keyof P) => (v: number) => setP({ ...p, [k]: v });
  return (
    <VizFrame title="Autocorrelation Laboratory" subtitle="Monthly temperature anomalies (°C)" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="Lag-1 autocorrelation φ" value={p.phi} min={-0.5} max={0.98} step={0.01} onChange={set('phi')} />
        <Slider label="Noise σ" unit="°C" value={p.noise} min={0.1} max={2} step={0.05} onChange={set('noise')} />
        <Slider label="Trend" unit="°C/decade" value={p.trend} min={0} max={1} step={0.01} onChange={set('trend')} />
        <Slider label="Seasonal amplitude" unit="°C" value={p.season} min={0} max={6} step={0.1} onChange={set('season')} />
        <Slider label="Length N" unit="months" value={p.n} min={48} max={720} step={12} onChange={set('n')} />
        <Toggle label="Include the trend" checked={showTrend} onChange={setShowTrend} />
      </>}
      stats={<>
        <Stat label="Sample lag-1 r₁" value={r1.toFixed(3)} />
        <Stat label="95% band ±1.96/√N" value={`±${band.toFixed(3)}`} />
        <Stat label="Effective N = N(1−r₁)/(1+r₁)" value={`${neff.toFixed(0)} of ${p.n}`} tone={neff < p.n / 2 ? 'warn' : undefined} />
        <Stat label="Persistence lost at lag" value={firstInside > 0 ? `${firstInside} months` : `> ${maxLag}`} />
      </>}
      explain={<>Bars outside the shaded band are significantly different from zero <i>if</i> the series were white noise (the ±1.96/√N approximation assumes independent, roughly normal data and a large N).
        With r₁ = {r1.toFixed(2)}, these {p.n} months carry only about <b>{neff.toFixed(0)} independent pieces of information</b>, so standard errors computed with N are too small and confidence intervals too narrow.
        {(p.trend > 0 && showTrend) || p.season > 0 ? ' A trend or seasonal cycle left in the data makes the ACF decay very slowly or oscillate: the series is not stationary, so remove them first.' : ''}</>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Plot x={[0, p.n]} y={[Math.min(...x) - 0.3, Math.max(...x) + 0.3]} height={240} xLabel="Time (months)" yLabel="Anomaly (°C)">
          <Line pts={x.map((v, t) => [t, v])} color={C.s1} width={1.4} />
          <HLine y={0} />
        </Plot>
        <Plot x={[-0.5, maxLag + 0.5]} y={[-0.6, 1.05]} height={240} xLabel="Lag k (months)" yLabel="Autocorrelation r(k)">
          <Bars data={[[maxLag / 2, band]]} width={maxLag + 1} color="var(--accent)" base={-band} opacity={0.12} />
          <Bars data={r.map((v, k) => [k, v])} width={0.6} colorOf={([, v]) => (Math.abs(v) >= band ? 'var(--s2)' : 'var(--s1)')} />
          <HLine y={band} color={C.accent} /><HLine y={-band} color={C.accent} /><HLine y={0} color="var(--axis)" dash="" />
        </Plot>
      </div>
      <Legend items={[{ label: 'Significant lag (outside the band)', color: 'var(--s2)', box: true }, { label: 'Within ±1.96/√N', color: 'var(--s1)', box: true }, { label: '95% band for white noise', color: 'var(--accent)', dash: true }]} />
    </VizFrame>
  );
}
