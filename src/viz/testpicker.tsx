// Which Statistical Test? A branching decision tool following the Quiz 1 review's
// comparison table, plus scenario practice with feedback.
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Seg, VizFrame } from '../components/Controls';
import { MathBlock } from '../components/Md';

export interface TestInfo { id: string; name: string; tests: string; h0: string; stat: string; dist: string; assume: string; py: string; note?: string }
// From the Quiz 1 review table (Lecture 12, slide 6) and Lecture 3–4.
export const TESTS: Record<string, TestInfo> = {
  t: { id: 't', name: 'Two-sample t-test (Student, pooled)', tests: 'Difference in means between 2 groups', h0: String.raw`\mu_1=\mu_2`, stat: String.raw`T_0=\frac{\hat\mu_x-\hat\mu_y}{\hat\sigma_p\sqrt{1/N_x+1/N_y}}`, dist: 't-distribution, df = Nₓ + N_y − 2', assume: 'Normal (sampling distribution of the mean), independent samples, equal variances', py: 'stats.ttest_ind(x, y)  # equal_var=True is SciPy’s default' },
  welch: { id: 'welch', name: "Welch's t-test", tests: 'Difference in means between 2 groups (unequal variances)', h0: String.raw`\mu_1=\mu_2`, stat: String.raw`T_0=\frac{\hat\mu_x-\hat\mu_y}{\sqrt{\hat\sigma_x^2/N_x+\hat\sigma_y^2/N_y}}`, dist: 't-distribution, Welch–Satterthwaite df', assume: 'Normal, independent samples; variances may differ', py: 'stats.ttest_ind(x, y, equal_var=False)', note: 'The review table writes this unpooled form for the t-test.' },
  f: { id: 'f', name: 'Classical F-test', tests: 'Difference in variance between 2 groups', h0: String.raw`\sigma_1^2=\sigma_2^2`, stat: String.raw`F_0=\hat\sigma_x^2/\hat\sigma_y^2`, dist: 'F-distribution, df = (Nₓ − 1, N_y − 1)', assume: 'Normal (sensitive to non-normality)', py: 'F = np.var(x, ddof=1) / np.var(y, ddof=1); p = 2*min(stats.f.cdf(F, dfx, dfy), stats.f.sf(F, dfx, dfy))', note: 'No single SciPy function for the classical F-test: compute it from variances (not standard deviations).' },
  ranksum: { id: 'ranksum', name: 'Wilcoxon rank-sum', tests: 'Difference in distribution between 2 groups', h0: String.raw`\text{same distribution: } P(X>Y)=0.5`, stat: String.raw`z=\frac{R_x-E[R_x]}{\sqrt{\mathrm{Var}[R_x]}}`, dist: 'z-distribution (normal approximation)', assume: '~None (distribution-free; independent samples)', py: 'stats.ranksums(x, y)' },
  kruskal: { id: 'kruskal', name: 'Kruskal–Wallis', tests: 'Difference in distribution among 3+ groups', h0: String.raw`\text{same distribution in all groups}`, stat: String.raw`\chi^2=\frac{1}{\mathrm{Var}[R_c]}\sum_{c=1}^{C}(R_c-E[R_c])^2`, dist: 'Chi-square, df = C − 1', assume: '~None', py: 'stats.kruskal(a, b, c)' },
  ks: { id: 'ks', name: 'Kolmogorov–Smirnov (2-sample)', tests: 'Difference in (entire) distribution between 2 groups', h0: String.raw`F_X(z)=F_Y(z)\ \text{for all } z`, stat: String.raw`D=\max_z|F_X(z)-F_Y(z)|`, dist: 'Kolmogorov distribution', assume: 'Fully none (distribution-free)', py: 'stats.ks_2samp(x, y)' },
  pearson: { id: 'pearson', name: 'Pearson correlation', tests: 'Linear association between two paired datasets', h0: String.raw`\rho=0`, stat: String.raw`T_0=\hat\rho\sqrt{\frac{N-2}{1-\hat\rho^2}}`, dist: 't-distribution, df = N − 2', assume: 'Normal, linear', py: 'stats.pearsonr(x, y)' },
  spearman: { id: 'spearman', name: 'Spearman rank correlation', tests: 'Monotonic dependence between two paired datasets', h0: String.raw`\rho_{sp}=0`, stat: String.raw`\rho_{sp}=\mathrm{corr}(R(X),R(Y))`, dist: 'z-distribution (normal approx.)', assume: '~None', py: 'stats.spearmanr(x, y)' },
};

type Node = { q: string; options: { label: string; next?: string; result?: string }[] };
const TREE: Record<string, Node> = {
  start: { q: 'What do you want to compare or measure?', options: [
    { label: 'Means (is one group warmer on average?)', next: 'meanNormal' },
    { label: 'Variances (is one group more variable?)', next: 'varNormal' },
    { label: 'Whole distributions / typical values', next: 'groups' },
    { label: 'Association between two paired variables', next: 'assoc' },
  ] },
  meanNormal: { q: 'Is it reasonable that each sample mean is normally distributed (roughly normal data or a large sample)?', options: [
    { label: 'Yes', next: 'equalVar' }, { label: 'No: small and strongly skewed (e.g. daily rainfall)', next: 'groups' },
  ] },
  equalVar: { q: 'Can you assume the two populations have equal variances?', options: [
    { label: 'Yes, equal variances', result: 't' }, { label: 'No / not sure', result: 'welch' },
  ] },
  varNormal: { q: 'Are both samples approximately normal?', options: [
    { label: 'Yes', result: 'f' }, { label: 'No: the F-test is sensitive to non-normality', result: 'nonnormalvar' },
  ] },
  groups: { q: 'How many groups?', options: [
    { label: 'Two groups', next: 'twoDist' }, { label: 'Three or more groups', result: 'kruskal' },
  ] },
  twoDist: { q: 'What kind of difference matters?', options: [
    { label: 'One tends to be larger (a shift / stochastic dominance)', result: 'ranksum' },
    { label: 'Any difference in shape: spread, tails, location', result: 'ks' },
  ] },
  assoc: { q: 'What kind of relationship?', options: [
    { label: 'Linear, with roughly normal data', result: 'pearson' },
    { label: 'Monotonic but possibly non-linear, or outliers / skewed', result: 'spearman' },
  ] },
};

const SCENARIOS: { s: string; answer: string; why: string }[] = [
  { s: 'Two independent records of July mean temperature (1951–1980 vs 1996–2025), roughly normal, with clearly different spreads. Did the mean change?', answer: 'welch', why: 'Means of two independent, roughly normal groups whose variances differ: Welch’s t-test.' },
  { s: 'Is year-to-year variability of summer rainfall larger now than in the past? Both records look approximately normal.', answer: 'f', why: 'A question about variances with normal data: the classical F-test (ratio of sample variances).' },
  { s: 'Storm intensities in three ocean basins, skewed distributions. Do the basins differ?', answer: 'kruskal', why: 'Three or more groups, no normality assumption: Kruskal–Wallis.' },
  { s: 'Daily rainfall (many zeros, long right tail) in two decades. Does one decade tend to have wetter days?', answer: 'ranksum', why: 'Two groups, strongly non-normal, asking whether one tends to be larger: Wilcoxon rank-sum.' },
  { s: 'Do two sets of maximum wind speeds come from the same distribution, including the shape of the tails?', answer: 'ks', why: 'Comparing entire distributions (any difference in the CDFs): Kolmogorov–Smirnov.' },
  { s: 'Is Niño 3.4 linearly related to rainfall anomalies (both roughly normal, paired by month)?', answer: 'pearson', why: 'Linear association between paired, roughly normal variables: Pearson correlation.' },
  { s: 'Wildfire burned area rises with dryness, but faster and faster (curved), with a few huge years. Is there a relationship?', answer: 'spearman', why: 'Monotonic, non-linear, outlier-prone: Spearman rank correlation.' },
  { s: 'Two groups of 8 strongly skewed values. A colleague wants a t-test on the means. What should you use instead?', answer: 'ranksum', why: 'The t-test needs a normal sampling distribution; with tiny skewed samples use a rank-based test (or a permutation test).' },
];

export default function TestPicker() {
  const [mode, setMode] = useState<'tree' | 'quiz'>('tree');
  const [path, setPath] = useState<string[]>(['start']);
  const [result, setResult] = useState<string | null>(null);
  const [k, setK] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const reset = () => { setPath(['start']); setResult(null); setPick(null); };
  const node = TREE[path[path.length - 1]];
  const info = result && TESTS[result];
  const sc = SCENARIOS[k % SCENARIOS.length];
  return (
    <VizFrame title="Which Statistical Test?" subtitle="Follow the questions, or practise with scenarios" onReset={reset}
      controls={<Seg value={mode} onChange={(m) => { setMode(m); reset(); }} label="Mode" options={[['tree', 'Decision tree'], ['quiz', 'Scenario practice']]} />}
      explain={<>Means → t-tests · variances → F-test · whole distributions → rank-sum / Kruskal–Wallis / KS · association → Pearson (linear) or Spearman (monotonic). Parametric tests (t, F, Pearson) assume normality; rank-based tests make (almost) no distribution assumptions.</>}>
      {mode === 'tree' ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2 text-sm">{path.map((id, i) => <span key={i} className="chip">{i + 1}. {TREE[id].q.split('?')[0]}?</span>)}</div>
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div key={path.join('/')} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-2">
                <b className="text-base">{node.q}</b>
                {node.options.map((o) => (
                  <button key={o.label} className="choice" onClick={() => (o.result ? setResult(o.result) : setPath([...path, o.next!]))}><span className="key">→</span><span>{o.label}</span></button>
                ))}
                {path.length > 1 && <button className="btn btn-sm justify-self-start" onClick={() => setPath(path.slice(0, -1))}>← Back</button>}
              </motion.div>
            ) : result === 'nonnormalvar' ? (
              <motion.div key="nn" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="callout callout-warning">
                <div className="callout-title">Assumption fails</div>
                <div>The classical F-test is sensitive to non-normality, so its p-value can't be trusted here. Compare variances with a <b>permutation test</b> or a <b>bootstrap</b> confidence interval for the variance ratio (Lecture 5–6: "if you have plenty of computing power").</div>
                <button className="btn btn-sm justify-self-start" onClick={reset}>Start again</button>
              </motion.div>
            ) : info && <TestCard info={info} onAgain={reset} />}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}><div className="eyebrow">Scenario {(k % SCENARIOS.length) + 1} of {SCENARIOS.length}</div><p className="font-semibold mt-1">{sc.s}</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.values(TESTS).map((t) => (
              <button key={t.id} disabled={!!pick} className={`choice ${pick ? (t.id === sc.answer ? 'correct' : t.id === pick ? 'wrong' : '') : ''}`} onClick={() => setPick(t.id)}>
                <span className="key">{t.id === pick ? (t.id === sc.answer ? '✓' : '✗') : '·'}</span><span>{t.name}</span>
              </button>
            ))}
          </div>
          {pick && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`card card-pad ${pick === sc.answer ? 'feedback-good' : 'feedback-bad'}`}>
              <b>{pick === sc.answer ? 'Correct.' : `Not quite: the best choice is ${TESTS[sc.answer].name}.`}</b> {sc.why}
              <div className="mt-2"><button className="btn btn-sm btn-primary" onClick={() => { setK(k + 1); setPick(null); }}>Next scenario →</button></div>
            </motion.div>
          )}
        </div>
      )}
    </VizFrame>
  );
}

function TestCard({ info, onAgain }: { info: TestInfo; onAgain: () => void }) {
  return (
    <motion.div key={info.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="card card-pad grid gap-2" style={{ background: 'var(--accent-soft)' }}>
      <div className="eyebrow">Recommended</div>
      <h4 className="text-xl font-bold">{info.name}</h4>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div><b>Tests:</b> {info.tests}</div>
        <div><b>Sampling distribution:</b> {info.dist}</div>
        <div><b>Key assumption:</b> {info.assume}</div>
        <div><b>Python:</b> <code>{info.py}</code></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <MathBlock tex={`H_0:\\ ${info.h0}`} />
        <MathBlock tex={info.stat} />
      </div>
      {info.note && <p className="text-sm text-muted">{info.note}</p>}
      <button className="btn btn-sm justify-self-start" onClick={onAgain}>Try another question</button>
    </motion.div>
  );
}
