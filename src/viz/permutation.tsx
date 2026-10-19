// Permutation Simulator: pool two groups, shuffle the labels, recompute the
// difference in means, and build the null distribution.
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Bars, C, Legend, Plot, VLine, histogram } from '../components/Chart';
import { Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { mean, randn, rng, shuffle } from '../lib/stats';

interface P { shift: number; n: number; seed: number }
const DEF: P = { shift: 0.6, n: 10, seed: 3 };
export const PRESETS: Preset<P>[] = [
  { id: 'warmer', label: 'Recent winters warmer by 0.6 °C', params: DEF },
  { id: 'none', label: 'No real difference', params: { shift: 0, n: 10, seed: 5 } },
  { id: 'big', label: 'Large difference, 15 each', params: { shift: 1.2, n: 15, seed: 8 } },
];

export default function PermutationSim({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [diffs, setDiffs] = useState<number[]>([]);
  const [labels, setLabels] = useState<number[] | null>(null); // shuffled group index per value
  const data = useMemo(() => {
    const r = rng(p.seed);
    const a = Array.from({ length: p.n }, () => +(26.6 + 0.9 * randn(r)).toFixed(2));
    const b = Array.from({ length: p.n }, () => +(26.6 + p.shift + 0.9 * randn(r)).toFixed(2));
    return { a, b };
  }, [p.n, p.shift, p.seed]);
  const pool = [...data.a, ...data.b];
  const obs = mean(data.b) - mean(data.a);
  const [r] = useState(() => rng(99));
  const run = (k: number) => {
    const out: number[] = [];
    let last: number[] = [];
    for (let i = 0; i < k; i++) {
      const idx = shuffle(pool.map((_, j) => j), r);
      last = idx;
      const g1 = idx.slice(0, p.n).map((j) => pool[j]), g2 = idx.slice(p.n).map((j) => pool[j]);
      out.push(mean(g2) - mean(g1));
    }
    const lab = new Array(pool.length).fill(0);
    last.forEach((j, pos) => { lab[j] = pos < p.n ? 0 : 1; });
    setLabels(lab);
    setDiffs((d) => [...d, ...out].slice(-20000));
  };
  const resetRuns = () => { setDiffs([]); setLabels(null); };
  const extreme = diffs.filter((d) => Math.abs(d) >= Math.abs(obs) - 1e-12).length;
  const pval = diffs.length ? (extreme + 1) / (diffs.length + 1) : NaN;
  const span = Math.max(1.6, Math.abs(obs) * 1.6);
  const h = histogram(diffs, -span, span, 40);
  const lab = labels || pool.map((_, j) => (j < p.n ? 0 : 1));
  return (
    <VizFrame title="Permutation Test Simulator" subtitle="DJF Niño 3.4-style values (°C) in two periods" presets={PRESETS} onPreset={(q) => { setP(q.params); resetRuns(); }} onReset={() => { setP(start); resetRuns(); }}
      controls={<>
        <Slider label="True difference" unit="°C" value={p.shift} min={0} max={2} step={0.05} onChange={(v) => { setP({ ...p, shift: v }); resetRuns(); }} />
        <Slider label="Values per group" value={p.n} min={5} max={30} onChange={(v) => { setP({ ...p, n: v }); resetRuns(); }} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-sm" onClick={() => run(1)}>Shuffle once</button>
          <button className="btn btn-sm" onClick={() => run(10)}>Run 10</button>
          <button className="btn btn-sm" onClick={() => run(100)}>Run 100</button>
          <button className="btn btn-sm btn-primary" onClick={() => run(1000)}>Run 1,000</button>
          <button className="btn btn-sm btn-ghost" onClick={resetRuns}>Clear</button>
        </div>
      </>}
      stats={<>
        <Stat label="Observed difference (period 2 − period 1)" value={`${obs.toFixed(3)} °C`} />
        <Stat label="Permutations run" value={diffs.length.toLocaleString()} />
        <Stat label="As or more extreme" value={extreme.toLocaleString()} />
        <Stat label="Permutation p-value (two-sided)" value={isFinite(pval) ? pval.toFixed(4) : 'run some'} tone={pval < 0.05 ? 'good' : undefined} />
      </>}
      explain={<>Under H₀ the two groups are <b>exchangeable</b> (same distribution), so the labels "period 1" and "period 2" are arbitrary. Each shuffle reassigns the pooled values to two groups <b>without replacement</b> and recomputes the difference.
        The histogram is the <b>null distribution</b>; the p-value is the share of shuffles at least as extreme as what we actually saw.</>}>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 grid gap-2 content-start">
          {[0, 1].map((g) => (
            <div key={g} className="card card-pad" style={{ padding: 12 }}>
              <div className="eyebrow mb-1">{labels ? `Shuffled group ${g + 1}` : g === 0 ? 'Period 1' : 'Period 2'}</div>
              <div className="flex flex-wrap gap-1.5">
                {pool.map((v, j) => lab[j] === g && (
                  <motion.span layout layoutId={`pv${j}`} key={j} className="chip" transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    style={{ background: j < p.n ? 'color-mix(in srgb, var(--s1) 22%, transparent)' : 'color-mix(in srgb, var(--s2) 25%, transparent)' }}>{v.toFixed(1)}</motion.span>
                ))}
              </div>
            </div>
          ))}
          <Legend items={[{ label: 'Originally period 1', color: 'var(--s1)', box: true }, { label: 'Originally period 2', color: 'var(--s2)', box: true }]} />
        </div>
        <div className="lg:col-span-3">
          <Plot x={[-span, span]} y={[0, h.max * 1.15]} height={260} xLabel="Difference in means under shuffling (°C)" yLabel="Number of permutations">
            <Bars data={h.bars} width={h.width} color={C.s3} opacity={0.6} />
            <VLine x={obs} color={C.bad} dash="" width={2.5} label="observed" />
            <VLine x={-obs} color={C.bad} dash="4 4" />
          </Plot>
        </div>
      </div>
    </VizFrame>
  );
}
