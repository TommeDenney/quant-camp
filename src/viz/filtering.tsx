// Time-Series Filtering Laboratory: running means (low-pass), raw − low-pass
// (high-pass), climatology and anomalies, and a fitted warming trend with its CI.
import { useMemo, useState } from 'react';
import { C, HLine, Legend, Line, Plot } from '../components/Chart';
import { Seg, Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { effectiveN, acf, linearTrend, randn, rng, runningMean, tPpf } from '../lib/stats';

interface P { years: number; trend: number; season: number; noise: number; phi: number; window: number; useTrend: boolean; useSeason: boolean }
const DEF: P = { years: 40, trend: 0.3, season: 10, noise: 1.2, phi: 0.5, window: 13, useTrend: true, useSeason: true };
export const PRESETS: Preset<P>[] = [
  { id: 'nyc', label: 'NYC-style monthly temperature', params: DEF },
  { id: 'global', label: 'Global-mean-style anomaly (no season)', params: { years: 50, trend: 0.2, season: 0, noise: 0.12, phi: 0.6, window: 61, useTrend: true, useSeason: false } },
  { id: 'notrend', label: 'No trend: only noise + season', params: { years: 40, trend: 0, season: 10, noise: 1.2, phi: 0.5, window: 13, useTrend: false, useSeason: true } },
];
type View = 'lowpass' | 'highpass' | 'anomaly';

export default function FilteringLab({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [view, setView] = useState<View>('lowpass');
  const n = p.years * 12;
  const t = useMemo(() => Array.from({ length: n }, (_, i) => 1985 + i / 12), [n]);
  const raw = useMemo(() => {
    const r = rng(17);
    let e = 0;
    return t.map((yr, i) => {
      e = p.phi * e + p.noise * randn(r);
      return 12 + (p.useTrend ? (p.trend / 10) * (yr - 1985) : 0) + (p.useSeason ? p.season * -Math.cos((2 * Math.PI * (i % 12)) / 12) : 0) + e;
    });
  }, [t, p.phi, p.noise, p.trend, p.season, p.useTrend, p.useSeason]);
  const clim = Array.from({ length: 12 }, (_, m) => { const v = raw.filter((_, i) => i % 12 === m); return v.reduce((a, b) => a + b, 0) / v.length; });
  const anom = raw.map((v, i) => v - clim[i % 12]);
  const w = p.window % 2 ? p.window : p.window + 1;
  const low = runningMean(view === 'anomaly' ? anom : raw, w);
  const high = raw.map((v, i) => v - low[i]);
  const series = view === 'anomaly' ? anom : raw;
  // Trend on the anomalies (seasonal cycle removed), slope per decade.
  const tr = linearTrend(t, anom);
  const r1 = acf(tr.resid, 1)[1];
  const neff = effectiveN(n, Math.max(0, r1));
  const tcrit = tPpf(0.975, Math.max(2, neff - 2));
  const seAdj = tr.se * Math.sqrt((n - 2) / Math.max(1, neff - 2));
  const per10 = (v: number) => (v * 10).toFixed(3);
  const ys = view === 'highpass' ? high.filter(isFinite) : series;
  const yr: [number, number] = [Math.min(...ys) - 0.5, Math.max(...ys) + 0.5];
  const set = (k: keyof P) => (v: number | boolean) => setP({ ...p, [k]: v });
  return (
    <VizFrame title="Time-Series Filtering Lab" subtitle="Monthly temperature, °C" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => { setP(start); setView('lowpass'); }}
      controls={<>
        <Seg value={view} onChange={setView} label="View" options={[['lowpass', 'Raw + low-pass (running mean)'], ['highpass', 'High-pass (raw − low-pass)'], ['anomaly', 'Anomalies + trend']]} />
        <Slider label="Running-mean window" unit="months" value={w} min={1} max={121} step={2} onChange={(v) => set('window')(v)} />
        <Slider label="Trend" unit="°C/decade" value={p.trend} min={0} max={1} step={0.01} onChange={(v) => set('trend')(v)} />
        <Slider label="Seasonal amplitude" unit="°C" value={p.season} min={0} max={15} step={0.5} onChange={(v) => set('season')(v)} />
        <Slider label="Noise σ" unit="°C" value={p.noise} min={0.05} max={3} step={0.05} onChange={(v) => set('noise')(v)} />
        <Slider label="Residual lag-1 autocorrelation" value={p.phi} min={0} max={0.95} step={0.01} onChange={(v) => set('phi')(v)} />
        <div className="flex gap-4 flex-wrap"><Toggle label="Trend on" checked={p.useTrend} onChange={(v) => set('useTrend')(v)} /><Toggle label="Seasonality on" checked={p.useSeason} onChange={(v) => set('useSeason')(v)} /></div>
      </>}
      stats={<>
        <Stat label="Fitted warming rate" value={`${per10(tr.slope)} °C/decade`} />
        <Stat label="95% CI (assuming independence)" value={`${per10(tr.lo)} to ${per10(tr.hi)}`} />
        <Stat label="Residual r₁ → effective N" value={`${r1.toFixed(2)} → ${neff.toFixed(0)} of ${n}`} />
        <Stat label="95% CI (inflated with N_eff)" value={`${per10(tr.slope - tcrit * seAdj)} to ${per10(tr.slope + tcrit * seAdj)}`} tone="warn" />
      </>}
      explain={view === 'lowpass' ? <>A <b>{w}-month running mean</b> is a <b>low-pass</b> filter: it averages away fluctuations shorter than the window and keeps the slow variability. A 12/13-month window removes the seasonal cycle.</>
        : view === 'highpass' ? <><b>High-pass</b> = raw − low-pass: what remains is the fast variability (here mostly the seasonal cycle and noise). A <b>band-pass</b> filter is the difference of two running means with different windows.</>
          : <>Subtracting each calendar month's average (the <b>climatology</b>) gives <b>anomalies</b> (deseasonalised data). The trend is fitted to the anomalies. Autocorrelated residuals mean fewer independent values, so the honest CI on the warming rate is <b>wider</b>.</>}>
      <Plot x={[1985, 1985 + p.years]} y={yr} height={280} xLabel="Year" yLabel={view === 'highpass' ? 'High-pass component (°C)' : view === 'anomaly' ? 'Temperature anomaly (°C)' : 'Temperature (°C)'}>
        {view !== 'highpass' && <Line pts={series.map((v, i) => [t[i], v])} color={C.muted} width={1} opacity={0.65} />}
        {view === 'highpass' && <><Line pts={high.map((v, i) => [t[i], v])} color={C.s4} width={1.1} /><HLine y={0} /></>}
        {view !== 'highpass' && <Line pts={low.map((v, i) => [t[i], v])} color={C.s1} width={2.6} />}
        {view === 'anomaly' && <Line pts={[[t[0], tr.intercept + tr.slope * t[0]], [t[n - 1], tr.intercept + tr.slope * t[n - 1]]]} color={C.bad} width={2.4} dash="7 4" />}
      </Plot>
      <Legend items={view === 'highpass' ? [{ label: 'Raw − running mean', color: 'var(--s4)' }] : [{ label: view === 'anomaly' ? 'Monthly anomalies' : 'Raw monthly values', color: 'var(--muted)' }, { label: `${w}-month running mean`, color: 'var(--s1)' }, ...(view === 'anomaly' ? [{ label: 'Linear trend (least squares)', color: 'var(--bad)', dash: true }] : [])]} />
    </VizFrame>
  );
}
