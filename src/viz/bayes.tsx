// Bayes Probability Tree: hurricane seasons and La Niña (Lecture 1–2, slide 59:
// 75 seasons, 23 La Niña, 37 above normal, 16 both). Edit the counts and follow
// marginal → joint → conditional → Bayes' theorem.
import { useState } from 'react';
import { Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { MathBlock } from '../components/Md';

interface P { total: number; b: number; a: number; ab: number; aName: string; bName: string }
const DEF: P = { total: 75, b: 23, a: 37, ab: 16, aName: 'above-normal season', bName: 'La Niña' };
export const PRESETS: Preset<P>[] = [
  { id: 'hurricane', label: 'Hurricane seasons & La Niña (lecture)', params: DEF },
  { id: 'heat', label: 'Heatwave & drought (illustrative)', params: { total: 60, b: 15, a: 12, ab: 8, aName: 'heatwave summer', bName: 'dry spring' } },
  { id: 'independent', label: 'Independent events', params: { total: 100, b: 40, a: 30, ab: 12, aName: 'event A', bName: 'event B' } },
];
const f = (x: number) => (isFinite(x) ? x.toFixed(3) : '–');

export default function BayesTree({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const ab = Math.min(p.ab, p.a, p.b);
  const notB = p.total - p.b, aNotB = p.a - ab;
  const neither = p.total - p.a - p.b + ab;
  const PA = p.a / p.total, PB = p.b / p.total, PAB = ab / p.total;
  const PAgB = ab / p.b, PAgNotB = notB ? aNotB / notB : NaN, PBgA = ab / p.a;
  const valid = neither >= 0 && aNotB >= 0;
  const W = 640, H = 260;
  const node = (x: number, y: number, label: string, sub: string, tone = 'var(--surface-2)') => (
    <g transform={`translate(${x},${y})`}><rect x={-80} y={-22} width={160} height={44} rx={10} fill={tone} stroke="var(--line)" />
      <text textAnchor="middle" y={-4} style={{ fill: 'var(--ink)', fontWeight: 700, fontSize: 12 }}>{label}</text>
      <text textAnchor="middle" y={13} style={{ fill: 'var(--muted)', fontSize: 11 }}>{sub}</text></g>
  );
  const edge = (x1: number, y1: number, x2: number, y2: number, label: string) => (
    <g><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--axis)" strokeWidth={1.5} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" style={{ fill: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>{label}</text></g>
  );
  return (
    <VizFrame title="Bayes Probability Tree" subtitle={`A = "${p.aName}", B = "${p.bName}"`} presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="Total years" value={p.total} min={10} max={200} onChange={(v) => setP({ ...p, total: v })} />
        <Slider label={`Years with B (${p.bName})`} value={p.b} min={1} max={p.total} onChange={(v) => setP({ ...p, b: v })} />
        <Slider label={`Years with A (${p.aName})`} value={p.a} min={1} max={p.total} onChange={(v) => setP({ ...p, a: v })} />
        <Slider label="Years with both A and B" value={ab} min={0} max={Math.min(p.a, p.b)} onChange={(v) => setP({ ...p, ab: v })} />
      </>}
      stats={valid ? <>
        <Stat label="Marginal P(A)" value={`${p.a}/${p.total} = ${f(PA)}`} />
        <Stat label="Marginal P(B)" value={`${p.b}/${p.total} = ${f(PB)}`} />
        <Stat label="Joint P(A ∩ B)" value={`${ab}/${p.total} = ${f(PAB)}`} />
        <Stat label="Conditional P(A | B)" value={`${ab}/${p.b} = ${f(PAgB)}`} tone="good" />
        <Stat label="Reverse P(B | A)" value={`${ab}/${p.a} = ${f(PBgA)}`} />
      </> : <Stat label="Check the counts" value="these numbers can't all be true" tone="bad" />}
      explain={<>P(A | B) uses only the {p.b} years where B happened (the denominator shrinks to B). Bayes' theorem recovers it without the joint count: P(A | B) = P(B | A)·P(A) / P(B) = {f(PBgA)} × {f(PA)} / {f(PB)} = <b>{f((PBgA * PA) / PB)}</b>.
        {Math.abs(PAgB - PA) < 0.02 ? ' Here P(A | B) ≈ P(A): knowing B tells you almost nothing, so A and B are close to independent.' : ` Knowing B changes the chance of A from ${f(PA)} to ${f(PAgB)}.`}</>}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Probability tree">
        {edge(100, 130, 300, 60, `P(B) = ${f(PB)}`)}
        {edge(100, 130, 300, 200, `P(not B) = ${f(1 - PB)}`)}
        {edge(380, 60, 530, 30, f(PAgB))}
        {edge(380, 60, 530, 92, f(1 - PAgB))}
        {edge(380, 200, 530, 170, f(PAgNotB))}
        {edge(380, 200, 530, 232, f(1 - PAgNotB))}
        {node(75, 130, `${p.total} years`, 'start here')}
        {node(300, 60, p.bName, `${p.b} years`)}
        {node(300, 200, `not ${p.bName}`, `${notB} years`)}
        {node(560, 30, `A: ${ab} yrs`, `joint ${f(PAB)}`, 'var(--good-soft)')}
        {node(560, 92, `not A: ${p.b - ab}`, `joint ${f((p.b - ab) / p.total)}`)}
        {node(560, 170, `A: ${aNotB} yrs`, `joint ${f(aNotB / p.total)}`, 'var(--accent-soft)')}
        {node(560, 232, `neither: ${neither}`, `joint ${f(neither / p.total)}`)}
      </svg>
      <div className="grid md:grid-cols-2 gap-2 mt-2">
        <MathBlock tex={String.raw`P(A\mid B)=\frac{P(A\cap B)}{P(B)}=\frac{P(B\mid A)\,P(A)}{P(B)}`} caption="Conditional probability and Bayes' theorem" />
        <MathBlock tex={String.raw`P(A)=P(A\cap B)+P(A\cap B^c)`} caption="A marginal is the sum of joint probabilities" />
      </div>
    </VizFrame>
  );
}
