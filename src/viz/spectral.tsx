// Harmonic / Spectral Laboratory: combine up to three cosines
// y = A cos(2πft + φ) = A cos(ωt + φ), sample them every Δt, and read the
// periodogram. Frequencies above Nyquist (1/2Δt) alias to lower ones.
import { useMemo, useState } from 'react';
import { Bars, C, Dots, Legend, Line, Plot, VLine, range } from '../components/Chart';
import { Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { aliasFrequency, nyquist, periodogram } from '../lib/stats';

interface W { A: number; f: number; ph: number; on: boolean }
interface P { waves: W[]; dt: number; T: number }
const DEF: P = { waves: [{ A: 1, f: 1, ph: 0, on: true }, { A: 0.5, f: 0.25, ph: 1, on: true }, { A: 0.3, f: 3, ph: 0, on: false }], dt: 1 / 12, T: 12 };
export const PRESETS: Preset<P>[] = [
  { id: 'annual', label: 'Annual cycle + ENSO-like 4-year cycle (monthly data)', params: DEF },
  { id: 'alias', label: 'Aliasing: 10 cycles/yr sampled monthly', params: { waves: [{ A: 1, f: 10, ph: 0, on: true }, { A: 0, f: 1, ph: 0, on: false }, { A: 0, f: 1, ph: 0, on: false }], dt: 1 / 12, T: 4 } },
  { id: 'nyquist', label: 'Exactly at Nyquist (6 cycles/yr)', params: { waves: [{ A: 1, f: 6, ph: 0.4, on: true }, { A: 0, f: 1, ph: 0, on: false }, { A: 0, f: 1, ph: 0, on: false }], dt: 1 / 12, T: 4 } },
  { id: 'three', label: 'Three harmonics', params: { waves: [{ A: 1, f: 1, ph: 0, on: true }, { A: 0.6, f: 2, ph: 0.5, on: true }, { A: 0.4, f: 3, ph: 1.2, on: true }], dt: 1 / 24, T: 6 } },
];
const COLORS = [C.s1, C.s2, C.s3];

export default function SpectralLab({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const on = p.waves.filter((w) => w.on && w.A > 0);
  const y = (t: number) => on.reduce((s, w) => s + w.A * Math.cos(2 * Math.PI * w.f * t + w.ph), 0);
  const fine = useMemo(() => range(0, p.T, 1200), [p.T]);
  const n = Math.max(4, Math.floor(p.T / p.dt));
  const ts = Array.from({ length: n }, (_, i) => i * p.dt);
  const samples = ts.map(y);
  const pg = periodogram(samples, p.dt);
  const ny = nyquist(p.dt);
  const pmax = Math.max(1e-6, ...pg.map((q) => q.power));
  const top = pg.slice(1).reduce((m, q) => (q.power > m.power ? q : m), pg[1] || pg[0]);
  const totVar = on.reduce((s, w) => s + (w.A * w.A) / 2, 0);
  const setW = (i: number, k: keyof W, v: number | boolean) => setP({ ...p, waves: p.waves.map((w, j) => (j === i ? { ...w, [k]: v } : w)) });
  const aliased = on.filter((w) => w.f > ny + 1e-9);
  return (
    <VizFrame title="Harmonic & Spectral Lab" subtitle="Time is in years; frequency f in cycles per year" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        {p.waves.map((w, i) => (
          <div key={i} className="grid gap-1.5 p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
            <div className="flex items-center gap-3"><Toggle label={`Wave ${i + 1}`} checked={w.on} onChange={(v) => setW(i, 'on', v)} />
              <span className="text-xs text-muted">ω = 2πf = {(2 * Math.PI * w.f).toFixed(2)} rad/yr · period = {(1 / w.f).toFixed(2)} yr · variance A²/2 = {((w.A * w.A) / 2).toFixed(3)}</span></div>
            {w.on && <>
              <Slider label="Amplitude A" value={w.A} min={0} max={2} step={0.05} onChange={(v) => setW(i, 'A', v)} />
              <Slider label="Frequency f" unit="cycles/yr" value={w.f} min={0.1} max={14} step={0.05} onChange={(v) => setW(i, 'f', v)} />
              <Slider label="Phase φ" unit="rad" value={w.ph} min={0} max={6.28} step={0.01} onChange={(v) => setW(i, 'ph', v)} />
            </>}
          </div>
        ))}
        <Slider label="Sampling interval Δt" unit="yr" value={p.dt} min={1 / 52} max={1} step={1 / 104} onChange={(v) => setP({ ...p, dt: v })} />
        <Slider label="Record length" unit="yr" value={p.T} min={2} max={40} step={1} onChange={(v) => setP({ ...p, T: v })} />
      </>}
      stats={<>
        <Stat label="Sampling rate 1/Δt" value={`${(1 / p.dt).toFixed(2)} per yr`} />
        <Stat label="Nyquist frequency 1/(2Δt)" value={`${ny.toFixed(2)} cycles/yr`} />
        <Stat label="Frequency resolution 1/(NΔt)" value={`${(1 / (n * p.dt)).toFixed(3)} cycles/yr`} />
        <Stat label="Dominant peak" value={top ? `f = ${top.f.toFixed(3)} (period ${(1 / top.f).toFixed(2)} yr)` : '–'} tone="good" />
      </>}
      explain={<>{aliased.length ? <><b>Aliasing:</b> {aliased.map((w) => `f = ${w.f} appears at ${aliasFrequency(w.f, p.dt).toFixed(2)} cycles/yr`).join('; ')}, because it is above the Nyquist frequency ({ny.toFixed(2)}). The samples cannot tell the two apart. </> : null}
        Each harmonic contributes variance A²/2, and because sines and cosines of different harmonics are <b>orthogonal</b>, the variances add (total ≈ {totVar.toFixed(3)}). The periodogram shows how much variance sits at each frequency.</>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Plot x={[0, p.T]} y={[-on.reduce((s, w) => s + w.A, 0) - 0.2, on.reduce((s, w) => s + w.A, 0) + 0.2]} height={250} xLabel="Time t (years)" yLabel="Signal y(t)">
          {on.map((w, i) => <Line key={i} pts={fine.map((t) => [t, w.A * Math.cos(2 * Math.PI * w.f * t + w.ph)])} color={COLORS[p.waves.indexOf(w)]} width={1} opacity={0.4} />)}
          <Line pts={fine.map((t) => [t, y(t)])} color={C.ink} width={1.6} />
          <Dots pts={ts.map((t, i) => [t, samples[i]])} color={C.bad} r={2.6} />
        </Plot>
        <Plot x={[0, Math.max(ny * 1.05, 1)]} y={[0, pmax * 1.15]} height={250} xLabel="Frequency f (cycles per year)" yLabel="Periodogram power">
          <Bars data={pg.map((q) => [q.f, q.power])} width={Math.max(1 / (n * p.dt) * 0.8, 0.005)} color={C.s5} />
          <VLine x={ny} color={C.bad} label="Nyquist" />
        </Plot>
      </div>
      <Legend items={[{ label: 'Combined signal', color: 'var(--ink)' }, { label: 'Individual waves', color: 'var(--s1)' }, { label: 'Samples every Δt', color: 'var(--bad)' }, { label: 'Periodogram', color: 'var(--s5)', box: true }]} />
    </VizFrame>
  );
}
