import { COLAB_HELP, COLAB_STEPS, PRACTICE_CSV } from '../content/colab';
import { colabNotebook } from '../lib/notebook';
import { CodeBlock, download } from './Bits';
import { Md } from './Md';
import { useProgress } from '../store/progress';

export function ColabGuide() {
  const { pyDone = [], togglePy } = useProgress();
  return (
    <section className="grid gap-4" aria-labelledby="colab-title">
      <div className="card card-pad grid gap-3" style={{ background: 'var(--accent-soft)' }}>
        <div className="eyebrow">Start here</div>
        <h2 id="colab-title" className="text-xl font-bold">Google Colab, step by step</h2>
        <p className="text-sm font-semibold">{pyDone.length} of {COLAB_STEPS.length} steps done</p>
        <p>Use your existing Colab notebook. Follow this short walkthrough, then try the course examples below. Predict the result first and explain it in your own words.</p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary btn-sm" href="https://colab.research.google.com/" target="_blank" rel="noreferrer">Open Google Colab</a>
          <button className="btn btn-sm" onClick={() => download('quant-camp-colab-starter.ipynb', colabNotebook(COLAB_STEPS), 'application/x-ipynb+json')}>Download Colab starter</button>
          <button className="btn btn-sm" onClick={() => download('quant-camp-practice.csv', PRACTICE_CSV, 'text/csv')}>Download practice CSV</button>
        </div>
        <p className="text-sm text-muted">Open a downloaded .ipynb with Colab’s File menu → Upload notebook. This guide is for study; follow the instructor’s rules for programming and exam materials.</p>
      </div>
      {COLAB_STEPS.map((step) => (
        <details key={step.id} className="card card-pad" open={step.id === 'run'}>
          <summary className="cursor-pointer font-bold flex items-center gap-2"><span className="flex-1">{step.title}</span>{pyDone.includes(step.id) && <span className="chip">Done</span>}</summary>
          <div className="grid gap-3 mt-3">
            <Md>{step.instructions}</Md>
            {step.code && <CodeBlock code={step.code} output={step.output} title="Paste into a Colab code cell" />}
            <div className="callout callout-tip text-sm"><b>Try it yourself</b><Md>{step.tryIt}</Md></div>
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={pyDone.includes(step.id)} onChange={() => togglePy(step.id)} /> I did this step in Colab</label>
          </div>
        </details>
      ))}
      <details className="card card-pad">
        <summary className="cursor-pointer font-bold">When something goes wrong</summary>
        <dl className="grid gap-4 mt-3 text-sm">{COLAB_HELP.map((h) => <div key={h.problem}><dt className="font-bold">{h.problem}</dt><dd>{h.fix}</dd></div>)}</dl>
      </details>
      <p className="text-xs text-muted">Colab guidance: <a className="underline" href="https://research.google.com/colaboratory/faq.html" target="_blank" rel="noreferrer">Google’s official Colab FAQ</a>. Notebook setup, saving and runtime behavior were checked against this guide.</p>
    </section>
  );
}
