// Cross-Validation Laboratory: add predictors and compare training skill with
// out-of-sample (K-fold) skill; see correlated predictors and data leakage.
import { useMemo, useState } from 'react';
import { Bars, C, Legend, Line, Plot } from '../components/Chart';
import { Seg, Slider, Stat, Toggle, VizFrame, type Preset } from '../components/Controls';
import { ols, randn, rng } from '../lib/stats';

interface P { n: number; noisePreds: number; useVpd: boolean; useTemp: boolean; leak: boolean; k: number; split: 'random' | 'blocked'; rho: number }
const DEF: P = { n: 40, noisePreds: 0, useVpd: true, useTemp: false, leak: false, k: 5, split: 'random', rho: 0.9 };
export const PRESETS: Preset<P>[] = [
  { id: 'one', label: 'One good predictor (VPD)', params: DEF },
  { id: 'many', label: 'VPD + 10 random predictors', params: { ...DEF, noisePreds: 10 } },
  { id: 'collinear', label: 'VPD + temperature (strongly correlated)', params: { ...DEF, useTemp: true } },
  { id: 'leak', label: 'Leakage: a predictor built from the answer', params: { ...DEF, leak: true } },
];

/** Synthetic years: burned area depends on VPD; temperature is correlated with VPD; noise predictors are pure noise. */
function makeData(n: number, rho: number, seed = 21) {
  const r = rng(seed);
  const rows: { vpd: number; temp: number; noise: number[]; y: number }[] = [];
  let ar = 0;
  for (let i = 0; i < n; i++) {
    ar = 0.6 * ar + randn(r) * 0.8; // slowly varying, autocorrelated climate state
    const vpd = ar + 0.02 * i;
    const temp = rho * vpd + Math.sqrt(1 - rho * rho) * randn(r);
    rows.push({ vpd, temp, noise: Array.from({ length: 12 }, () => randn(r)), y: 2 + 1.5 * vpd + randn(r) });
  }
  return rows;
}
function design(rows: ReturnType<typeof makeData>, p: P) {
  return rows.map((row) => [
    ...(p.useVpd ? [row.vpd] : []), ...(p.useTemp ? [row.temp] : []), ...row.noise.slice(0, p.noisePreds),
    ...(p.leak ? [row.y + 0.05 * row.noise[11]] : []),
  ]);
}
function skill(y: number[], yhat: number[]) {
  const m = y.reduce((a, b) => a + b, 0) / y.length;
  const sse = y.reduce((a, v, i) => a + (v - yhat[i]) ** 2, 0);
  const sst = y.reduce((a, v) => a + (v - m) ** 2, 0);
  return { r2: 1 - sse / sst, rmse: Math.sqrt(sse / y.length) };
}
function cv(X: number[][], y: number[], k: number, split: 'random' | 'blocked', seed = 4) {
  const n = y.length;
  const order = Array.from({ length: n }, (_, i) => i);
  if (split === 'random') { const r = rng(seed); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
  const pred = new Array(n).fill(0);
  for (let f = 0; f < k; f++) {
    const test = order.filter((_, i) => Math.floor((i * k) / n) === f);
    const train = order.filter((i) => !test.includes(i));
    if (!X[0].length) { const m = train.reduce((a, i) => a + y[i], 0) / train.length; test.forEach((i) => (pred[i] = m)); continue; }
    if (train.length <= X[0].length + 1) return { r2: NaN, rmse: NaN };
    const fit = ols(train.map((i) => X[i]), train.map((i) => y[i]));
    test.forEach((i) => { pred[i] = fit.coef[0] + X[i].reduce((s, v, j) => s + v * fit.coef[j + 1], 0); });
  }
  return skill(y, pred);
}

export default function CrossValLab({ preset }: { preset?: string }) {
  const start = PRESETS.find((p) => p.id === preset)?.params || DEF;
  const [p, setP] = useState<P>(start);
  const rows = useMemo(() => makeData(p.n, p.rho), [p.n, p.rho]);
  const y = rows.map((r) => r.y);
  const X = design(rows, p);
  const nPred = X[0].length;
  const train = nPred ? (() => { const f = ols(X, y); return { ...skill(y, f.fitted), coef: f.coef, se: f.se }; })() : { ...skill(y, y.map(() => y.reduce((a, b) => a + b, 0) / y.length)), coef: [], se: [] };
  const test = cv(X, y, p.k, p.split);
  // Training vs validation R² as noise predictors are added (with VPD).
  const curve = useMemo(() => Array.from({ length: 13 }, (_, m) => {
    const q = { ...p, noisePreds: m, leak: false };
    const Xm = design(rows, q);
    const tr = Xm[0].length ? skill(y, ols(Xm, y).fitted).r2 : 0;
    return [m, tr, cv(Xm, y, p.k, p.split).r2] as [number, number, number];
  }), [rows, p.k, p.split, p.useVpd, p.useTemp]);
  const set = (k: keyof P) => (v: P[keyof P]) => setP({ ...p, [k]: v });
  const vpdIdx = p.useVpd ? 1 : -1;
  return (
    <VizFrame title="Cross-Validation Laboratory" subtitle="Predicting burned area from climate predictors (synthetic years)" presets={PRESETS} onPreset={(q) => setP(q.params)} onReset={() => setP(start)}
      controls={<>
        <div className="flex flex-wrap gap-4">
          <Toggle label="VPD (the real driver)" checked={p.useVpd} onChange={(v) => set('useVpd')(v)} />
          <Toggle label="Temperature (correlated with VPD)" checked={p.useTemp} onChange={(v) => set('useTemp')(v)} />
          <Toggle label="Leaky predictor (made from the target)" checked={p.leak} onChange={(v) => set('leak')(v)} />
        </div>
        <Slider label="Random noise predictors" value={p.noisePreds} min={0} max={12} onChange={(v) => set('noisePreds')(v)} />
        <Slider label="Years of data N" value={p.n} min={20} max={120} step={1} onChange={(v) => set('n')(v)} />
        <Slider label="K folds (K = N is leave-one-out)" value={p.k} min={2} max={Math.min(20, p.n)} onChange={(v) => set('k')(v)} />
        <Seg value={p.split} onChange={(v) => set('split')(v)} label="Split" options={[['random', 'Random folds'], ['blocked', 'Blocked in time']]} />
      </>}
      stats={<>
        <Stat label="Predictors" value={nPred} />
        <Stat label="Training R²" value={isFinite(train.r2) ? train.r2.toFixed(3) : '–'} />
        <Stat label={`${p.k}-fold CV R² (out of sample)`} value={isFinite(test.r2) ? test.r2.toFixed(3) : 'too few data'} tone={test.r2 < train.r2 - 0.1 ? 'warn' : 'good'} />
        <Stat label="Training RMSE / CV RMSE" value={`${train.rmse.toFixed(2)} / ${isFinite(test.rmse) ? test.rmse.toFixed(2) : '–'}`} />
        {vpdIdx > 0 && train.coef.length > 1 && <Stat label="VPD coefficient ± SE" value={`${train.coef[vpdIdx].toFixed(2)} ± ${train.se[vpdIdx].toFixed(2)}`} tone={p.useTemp ? 'warn' : undefined} />}
      </>}
      explain={p.leak ? <><b>Leakage:</b> the extra predictor was built from the answer itself, so both training and CV look almost perfect, but it would be useless for forecasting. Information from the test data (or the future) must never enter the training step.</>
        : p.useTemp ? <>VPD and temperature are correlated (ρ ≈ {p.rho}), so the model can trade one for the other: the individual coefficients become uncertain (larger SE) and hard to interpret, even though predictions barely change.</>
          : <>Training R² can only go <b>up</b> as predictors are added, even pure noise. Cross-validation scores each fold on data the model didn't see; when it falls while training R² rises, you're <b>overfitting</b>.
            {p.split === 'blocked' ? ' Blocked folds keep neighbouring (autocorrelated) years together, a more honest test for time series.' : ' With autocorrelated time series, random folds put neighbouring years in both training and testing, which leaks information; blocked folds are safer.'}</>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Plot x={[-0.5, 12.5]} y={[Math.min(-0.2, ...curve.map((c) => c[2]).filter(isFinite)), 1]} height={240} xLabel="Number of random noise predictors added" yLabel="R²">
          <Line pts={curve.map((c) => [c[0], c[1]])} color={C.s1} width={2.4} />
          <Line pts={curve.map((c) => [c[0], c[2]])} color={C.s2} width={2.4} dash="6 4" />
        </Plot>
        <Plot x={[0, 3]} y={[Math.min(0, test.r2 || 0) - 0.05, 1]} height={240} xLabel="" yLabel="R²" xTicks={[]}>
          <Bars data={[[1, train.r2], [2, isFinite(test.r2) ? test.r2 : 0]]} width={0.6} colorOf={(_, i) => (i ? 'var(--s2)' : 'var(--s1)')} />
        </Plot>
      </div>
      <Legend items={[{ label: 'Training R² (all data)', color: 'var(--s1)' }, { label: `${p.k}-fold cross-validated R²`, color: 'var(--s2)', dash: true }]} />
    </VizFrame>
  );
}
