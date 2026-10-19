// Regression Playground: drag the points, compare linear, quadratic, log-linear and a
// deliberately over-flexible polynomial; read SSE, R², adjusted R², RMSE and residuals.
import { useMemo, useState } from 'react';
import { C, Dots, Legend, Line, Plot, Segment, HLine, range } from '../components/Chart';
import { Seg, Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { ols, randn, rng } from '../lib/stats';

type Model = 'linear' | 'quad' | 'loglin' | 'poly8';
interface P { pts: [number, number][]; model: Model }
// Illustrative data: summer vapour-pressure deficit (kPa) vs burned area (thousand km²), constructed so log(area) is ~linear in VPD.
function makeData(seed: number, n = 18) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const x = 0.8 + (1.4 * i) / (n - 1) + 0.03 * randn(r);
    const y = Math.exp(-1.2 + 2.1 * x + 0.25 * randn(r));
    return [+x.toFixed(3), +y.toFixed(2)] as [number, number];
  });
}
const DEF: P = { pts: makeData(5), model: 'linear' };
export const PRESETS: Preset<P>[] = [
  { id: 'vpd', label: 'Burned area vs VPD (curved)', params: DEF },
  { id: 'vpd-log', label: 'Same data, log-linear model', params: { pts: makeData(5), model: 'loglin' } },
  { id: 'overfit', label: 'Overfitting: degree-8 polynomial, 10 points', params: { pts: makeData(9, 10), model: 'poly8' } },
];
const DEG: Record<Model, number> = { linear: 1, quad: 2, loglin: 1, poly8: 8 };

export default function RegressionPlayground({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const [drag, setDrag] = useState<number | null>(null);
  const [manual, setManual] = useState(false);
  const [b0, setB0] = useState(-20);
  const [b1, setB1] = useState(25);
  const xs = p.pts.map((q) => q[0]), ys = p.pts.map((q) => q[1]);
  const xm = xs.reduce((a, b) => a + b, 0) / xs.length;
  const deg = DEG[p.model];
  const fit = useMemo(() => {
    const yy = p.model === 'loglin' ? ys.map((v) => Math.log(Math.max(v, 0.01))) : ys;
    const X = xs.map((x) => Array.from({ length: deg }, (_, k) => (x - xm) ** (k + 1)));
    return ols(X, yy);
  }, [p.pts, p.model]);
  const predict = (x: number) => {
    if (manual && p.model === 'linear') return b0 + b1 * x;
    const v = fit.coef[0] + fit.coef.slice(1).reduce((s, c, k) => s + c * (x - xm) ** (k + 1), 0);
    return p.model === 'loglin' ? Math.exp(v) : v;
  };
  const fitted = xs.map(predict);
  const resid = ys.map((v, i) => v - fitted[i]);
  const sse = resid.reduce((a, e) => a + e * e, 0);
  const ybar = ys.reduce((a, b) => a + b, 0) / ys.length;
  const sst = ys.reduce((a, v) => a + (v - ybar) ** 2, 0);
  const r2 = 1 - sse / sst;
  const n = ys.length, k = deg;
  const adj = 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - k - 1);
  const rmse = Math.sqrt(sse / n);
  const xr: [number, number] = [0.6, 2.4];
  const yr: [number, number] = [Math.min(0, ...ys) - 2, Math.max(...ys) * 1.15];
  const curve = range(xr[0], xr[1], 240).map((x) => [x, predict(x)] as [number, number]);
  const onPointer = (x: number, y: number, kind: 'down' | 'move' | 'up') => {
    if (kind === 'up') { setDrag(null); return; }
    if (kind === 'move' && drag != null) setP({ ...p, pts: p.pts.map((q, i) => (i === drag ? [+Math.min(xr[1], Math.max(xr[0], x)).toFixed(3), +Math.max(0, y).toFixed(2)] : q)) });
  };
  const eq = p.model === 'loglin' ? 'ln(ŷ) = b₀ + b₁(x − x̄)' : p.model === 'linear' ? 'ŷ = b₀ + b₁(x − x̄)' : p.model === 'quad' ? 'ŷ = b₀ + b₁(x − x̄) + b₂(x − x̄)²' : 'ŷ = b₀ + … + b₈(x − x̄)⁸';
  return (
    <VizFrame title="Regression Playground" subtitle="Drag any point. Illustrative wildfire data: burned area vs summer vapour-pressure deficit" presets={PRESETS} onPreset={(q) => { setP(q.params); setManual(false); }} onReset={() => { setP(start); setManual(false); }}
      controls={<>
        <Seg value={p.model} onChange={(m) => setP({ ...p, model: m })} label="Model" options={[['linear', 'Linear'], ['quad', 'Quadratic'], ['loglin', 'Log-linear'], ['poly8', 'Degree 8 (overfit)']]} />
        {p.model === 'linear' && <Toggle label="Set the coefficients by hand (instead of least squares)" checked={manual} onChange={(v) => { setManual(v); if (v) { setB0(+(fit.coef[0] - fit.coef[1] * xm).toFixed(1)); setB1(+fit.coef[1].toFixed(1)); } }} />}
        {manual && p.model === 'linear' && <>
          <Slider label="Intercept b₀" unit="thousand km²" value={b0} min={-80} max={40} step={0.5} onChange={setB0} />
          <Slider label="Slope b₁" unit="per kPa" value={b1} min={-20} max={80} step={0.5} onChange={setB1} />
        </>}
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-sm" onClick={() => setP({ ...p, pts: [...p.pts, [2.2, Math.max(...ys) * 0.2]] })}>Add an outlier</button>
          <button className="btn btn-sm" onClick={() => setP({ ...p, pts: p.pts.slice(0, -1) })} disabled={p.pts.length <= deg + 2}>Remove last point</button>
        </div>
      </>}
      stats={<>
        <Stat label="Model" value={eq} />
        <Stat label="SSE = Σ residual²" value={sse.toFixed(1)} tone={manual ? 'warn' : undefined} />
        <Stat label="R²" value={r2.toFixed(3)} />
        <Stat label="Adjusted R²" value={adj.toFixed(3)} />
        <Stat label="RMSE" value={`${rmse.toFixed(2)} thousand km²`} />
      </>}
      explain={manual ? <>You're choosing the line yourself. <b>Ordinary least squares</b> picks the b₀ and b₁ that make the SSE as small as possible; try to beat it (you can't).</>
        : p.model === 'poly8' ? <>The degree-8 curve chases every point: training R² goes up, but it wiggles wildly between points and would predict new years badly. This is <b>overfitting</b>. Adjusted R² penalises the extra coefficients.</>
          : p.model === 'loglin' ? <>A <b>log-linear</b> model fits ln(y) with a straight line, so each 1 kPa of VPD multiplies burned area by e^b₁. Good for variables that grow multiplicatively.</>
            : <>Each vertical stick is a <b>residual</b> (observed − fitted). Least squares minimises the sum of their squares. Curved residual patterns mean the model shape is wrong.</>}>
      <Plot x={xr} y={yr} height={300} xLabel="Summer vapour-pressure deficit (kPa)" yLabel="Burned area (thousand km²)" onPointer={onPointer}>
        {p.pts.map(([x, y], i) => <Segment key={i} a={[x, y]} b={[x, fitted[i]]} color="var(--s4)" width={1.4} dash="3 3" />)}
        <Line pts={curve} color={C.s1} width={2.4} />
        <Dots pts={p.pts} color={C.s2} r={6} onDown={(i) => setDrag(i)} />
      </Plot>
      <div className="grid md:grid-cols-2 gap-3 items-start">
        <Legend items={[{ label: 'Observations (drag me)', color: 'var(--s2)', box: true }, { label: 'Fitted model', color: 'var(--s1)' }, { label: 'Residuals', color: 'var(--s4)', dash: true }]} />
        <Plot x={xr} y={[Math.min(...resid) * 1.2 - 1, Math.max(...resid) * 1.2 + 1]} height={150} xLabel="VPD (kPa)" yLabel="Residual">
          <HLine y={0} dash="" />
          <Dots pts={xs.map((x, i) => [x, resid[i]])} color={C.s4} r={4} />
        </Plot>
      </div>
    </VizFrame>
  );
}
