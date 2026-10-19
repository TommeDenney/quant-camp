// Skewness/Kurtosis Playground: a small rainfall sample where you control one
// extreme day. The deviation bars show why cubing keeps the sign (skewness) and
// why the fourth power makes extremes dominate (kurtosis).
import { useState } from 'react';
import { Bars, C, Dots, HLine, Legend, Plot, VLine } from '../components/Chart';
import { Seg, Slider, Stat, VizFrame, type Preset } from '../components/Controls';
import { mean } from '../lib/stats';

const BASE = [2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10];
interface P { extreme: number; shift: number; scale: number }
const DEF: P = { extreme: 12, shift: 0, scale: 1 };
export const PRESETS: Preset<P>[] = [
  { id: 'calm', label: 'No unusual day', params: { extreme: 6, shift: 0, scale: 1 } },
  { id: 'storm', label: 'One very wet day (storm)', params: { extreme: 60, shift: 0, scale: 1 } },
  { id: 'units', label: 'Same data in inches (÷ 25.4)', params: { extreme: 60, shift: 0, scale: 1 / 25.4 } },
];

/** The professor's sample moments (Lecture 1–2): sums divided by N − 1, standardised by σ̂ (also N − 1). */
export function profMoments(x: number[]) {
  const N = x.length, m = mean(x);
  const v = x.reduce((a, b) => a + (b - m) ** 2, 0) / (N - 1);
  const s = Math.sqrt(v);
  const g = x.reduce((a, b) => a + (b - m) ** 3, 0) / (N - 1) / s ** 3;
  const k = x.reduce((a, b) => a + (b - m) ** 4, 0) / (N - 1) / s ** 4;
  return { mean: m, variance: v, sd: s, skew: g, kurt: k };
}

export default function MomentsPlayground({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [power, setPower] = useState<'2' | '3' | '4'>('3');
  const x = [...BASE, p.extreme].sort((a, b) => a - b).map((v) => v * p.scale + p.shift);
  const m = profMoments(x);
  const dev = x.map((v) => (v - m.mean) / m.sd);
  const k = +power;
  const bars = dev.map((d, i) => [i + 1, d ** k] as [number, number]);
  const yAbs = Math.max(1, ...bars.map((b) => Math.abs(b[1])));
  const unit = p.scale === 1 ? 'mm' : 'in';
  return (
    <VizFrame title="Skewness & Kurtosis Playground" subtitle="12 days of rainfall: drag the slider to change the wettest day" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <Slider label="Wettest day" unit="mm" value={p.extreme} min={0} max={80} step={1} onChange={(v) => setP({ ...p, extreme: v })} />
        <Slider label="Add a constant (shift)" unit={unit} value={p.shift} min={-10} max={20} step={0.5} onChange={(v) => setP({ ...p, shift: v })} />
        <div className="flex flex-wrap gap-3 items-center"><span className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>Show standardised deviations raised to the power</span>
          <Seg value={power} onChange={setPower} label="Power" options={[['2', '² (variance)'], ['3', '³ (skewness)'], ['4', '⁴ (kurtosis)']]} /></div>
      </>}
      stats={<>
        <Stat label="Mean μ̂" value={`${m.mean.toFixed(2)} ${unit}`} />
        <Stat label="Std dev σ̂ (N − 1)" value={`${m.sd.toFixed(2)} ${unit}`} />
        <Stat label="Skewness γ̂" value={m.skew.toFixed(2)} tone={Math.abs(m.skew) >= 1 ? 'warn' : undefined} />
        <Stat label="Kurtosis κ̂" value={m.kurt.toFixed(2)} />
      </>}
      explain={k === 3 ? <>Each bar is a day's <b>standardised deviation cubed</b>. Cubing keeps the sign, so days below the mean pull left (negative) and days above pull right (positive). One very wet day makes a huge positive cube, so the average is positive: a <b>longer right tail</b>.</>
        : k === 4 ? <>Fourth powers are always positive and grow explosively: a day 3σ away contributes 81, a day 1σ away only 1. That is why kurtosis is driven almost entirely by the <b>tails</b> (the extremes).</>
          : <>Squared deviations are always positive (so the sign of a deviation is lost). Their average is the variance; its square root is σ̂, which we divide by to remove the units.</>}>
      <div className="grid gap-4 md:grid-cols-2">
        <Plot x={[0, Math.max(...x) * 1.1 + 1]} y={[0, 1]} height={150} xLabel={`Rainfall (${unit})`} yTicks={[]}>
          <Dots pts={x.map((v, i) => [v, 0.3 + (i % 4) * 0.12])} color={C.s1} r={6} />
          <VLine x={m.mean} color={C.s2} label="mean" />
        </Plot>
        <Plot x={[0, 13]} y={[-yAbs * 1.1, yAbs * 1.1]} height={220} xLabel="Day (sorted by rainfall)" yLabel={`(x − μ̂)${['', '', '²', '³', '⁴'][k]} / σ̂${['', '', '²', '³', '⁴'][k]}`} xTicks={[1, 4, 8, 12]}>
          <Bars data={bars} width={0.75} colorOf={([, v]) => (v >= 0 ? 'var(--s1)' : 'var(--s4)')} />
          <HLine y={0} color="var(--axis)" dash="" />
        </Plot>
      </div>
      <Legend items={[{ label: 'Above the mean', color: 'var(--s1)', box: true }, { label: 'Below the mean', color: 'var(--s4)', box: true }]} />
      <p className="text-sm text-muted mt-2">Try "Same data in inches": every value is divided by 25.4, yet γ̂ and κ̂ don't change (scale invariance). Adding a constant doesn't change them either (shift invariance). Moments here use the lecture's N − 1 formulas; <code>scipy.stats.skew</code> uses N by default, so it gives a slightly different number for small samples.</p>
    </VizFrame>
  );
}
