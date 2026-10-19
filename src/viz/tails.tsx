// Hypothesis-Test Tail Visualizer: set α, move the observed statistic, choose one- or
// two-sided. Predict "significant?" first, then reveal the p-value area.
import { useMemo, useState } from 'react';
import { Area, C, Legend, Line, Plot, VLine, range } from '../components/Chart';
import { Seg, Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { normCdf, normPdf, normPpf, tCdf, tPdf, tPpf, type Tails } from '../lib/stats';

interface P { alpha: number; t: number; tails: Tails; dist: 'z' | 't'; df: number }
const DEF: P = { alpha: 0.05, t: -1.85, tails: 'two', dist: 't', df: 198 };
export const PRESETS: Preset<P>[] = [
  { id: 'lecture-t', label: 'Lecture 3: t = −1.85 (two-sided)', params: DEF },
  { id: 'nino-welch', label: 'Niño 3.4 means, Welch t = 3.48', params: { alpha: 0.05, t: 3.48, tails: 'two', dist: 't', df: 700 } },
  { id: 'one-sided', label: 'Warming? one-sided z = 1.80', params: { alpha: 0.05, t: 1.8, tails: 'greater', dist: 'z', df: 30 } },
  { id: 'small-df', label: 'Small sample, t with df = 5', params: { alpha: 0.05, t: 2.3, tails: 'two', dist: 't', df: 5 } },
];

export default function TailVisualizer({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [guess, setGuess] = useState<null | boolean>(null);
  const pdf = (v: number) => (p.dist === 'z' ? normPdf(v) : tPdf(v, p.df));
  const cdf = (v: number) => (p.dist === 'z' ? normCdf(v) : tCdf(v, p.df));
  const ppf = (q: number) => (p.dist === 'z' ? normPpf(q) : tPpf(q, p.df));
  const xs = useMemo(() => range(-5, 5, 400), []);
  const curve = xs.map((v) => [v, pdf(v)] as [number, number]);
  const pv = p.tails === 'two' ? 2 * (1 - cdf(Math.abs(p.t))) : p.tails === 'greater' ? 1 - cdf(p.t) : cdf(p.t);
  const crit = p.tails === 'two' ? [ppf(p.alpha / 2), ppf(1 - p.alpha / 2)] : p.tails === 'greater' ? [ppf(1 - p.alpha)] : [ppf(p.alpha)];
  const sig = pv < p.alpha;
  const change = (q: Partial<P>) => { setP({ ...p, ...q }); setGuess(null); };
  const reject = (sel: (v: number) => boolean) => curve.filter(([v]) => sel(v));
  const tail = (sel: (v: number) => boolean) => curve.filter(([v]) => sel(v));
  const absT = Math.abs(p.t);
  return (
    <VizFrame title="Hypothesis-Test Tail Visualizer" subtitle="Where does the observed statistic fall in the null distribution?" presets={PRESETS} onPreset={(q) => { setP(q.params); setGuess(null); }} onReset={() => { setP(start); setGuess(null); }}
      controls={<>
        <div className="flex flex-wrap gap-3">
          <Seg value={p.tails} onChange={(v) => change({ tails: v })} label="Alternative" options={[['two', 'Two-sided ≠'], ['greater', 'One-sided >'], ['less', 'One-sided <']]} />
          <Seg value={p.dist} onChange={(v) => change({ dist: v })} label="Null distribution" options={[['z', 'z (σ known)'], ['t', 't (σ estimated)']]} />
        </div>
        <Slider label="Significance level α" value={p.alpha} min={0.001} max={0.2} step={0.001} onChange={(v) => change({ alpha: v })} />
        <Slider label="Observed test statistic" value={p.t} min={-4.5} max={4.5} step={0.01} onChange={(v) => change({ t: v })} />
        {p.dist === 't' && <Slider label="Degrees of freedom" value={p.df} min={1} max={200} step={1} onChange={(v) => change({ df: v })} />}
      </>}
      stats={guess === null ? (
        <div className="flex flex-wrap items-center gap-3"><b className="text-sm">Predict first: is this result significant at α = {p.alpha}?</b>
          <button className="btn btn-sm" onClick={() => setGuess(true)}>Yes, reject H₀</button>
          <button className="btn btn-sm" onClick={() => setGuess(false)}>No, fail to reject</button></div>
      ) : <>
        <Stat label="p-value" value={pv < 1e-4 ? pv.toExponential(2) : pv.toFixed(4)} tone={sig ? 'good' : undefined} />
        <Stat label="Critical value(s)" value={crit.map((c) => c.toFixed(3)).join('  and  ')} />
        <Stat label="Decision" value={sig ? 'Reject H₀' : 'Fail to reject H₀'} tone={sig ? 'good' : 'warn'} />
        <Stat label="Your prediction" value={guess === sig ? '✓ correct' : '✗ not this time'} tone={guess === sig ? 'good' : 'bad'} />
      </>}
      explain={<>The <b>red regions</b> are fixed in advance by α (the rejection region). The <b>blue area</b> is the p-value: the probability, <i>if H₀ were true</i>, of a statistic at least as extreme as the one observed.
        {p.tails === 'two' ? ' Two-sided tests count both tails, so the p-value is twice one tail.' : ' A one-sided test only counts the tail in the direction of the alternative.'} The p-value is <b>not</b> the probability that H₀ is true.</>}>
      <Plot x={[-5, 5]} y={[0, 0.45]} height={280} xLabel="Test statistic (under H₀)" yLabel="Probability density">
        {p.tails !== 'greater' && <Area pts={reject((v) => v <= crit[0])} color={C.bad} opacity={0.35} />}
        {p.tails !== 'less' && <Area pts={reject((v) => v >= crit[crit.length - 1])} color={C.bad} opacity={0.35} />}
        {guess !== null && <>
          {(p.tails === 'two' || p.tails === 'less') && <Area pts={tail((v) => (p.tails === 'two' ? v <= -absT : v <= p.t))} color={C.s1} opacity={0.55} />}
          {(p.tails === 'two' || p.tails === 'greater') && <Area pts={tail((v) => (p.tails === 'two' ? v >= absT : v >= p.t))} color={C.s1} opacity={0.55} />}
        </>}
        <Line pts={curve} color={C.ink} width={2} />
        {crit.map((c) => <VLine key={c} x={c} color={C.bad} dash="4 4" />)}
        <VLine x={p.t} color={C.s1} dash="" width={2.5} label={`observed ${p.t.toFixed(2)}`} />
      </Plot>
      <Legend items={[{ label: `Rejection region (total area α = ${p.alpha})`, color: 'var(--bad)', box: true }, { label: 'p-value area', color: 'var(--s1)', box: true }, { label: 'Observed statistic', color: 'var(--s1)' }]} />
    </VizFrame>
  );
}
