// Python Lab: worked NumPy/SciPy examples to read, copy, or download as a notebook.
// Nothing runs here: run the code in Jupyter (or the course environment).
import { useState } from 'react';
import { CodeBlock, download } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { Md } from '../components/Md';
import { PY_EXAMPLES, type PyExample } from '../content/python';
import { MODULES } from '../data';

const lines = (s: string) => s.replace(/\n$/, '').split('\n').map((l, i, a) => (i < a.length - 1 ? `${l}\n` : l));
const mdCell = (s: string) => ({ cell_type: 'markdown', metadata: {}, source: lines(s) });
const codeCell = (s: string) => ({ cell_type: 'code', metadata: {}, execution_count: null, outputs: [], source: lines(s) });

export function notebook(exs: PyExample[]) {
  const cells = exs.flatMap((e) => [
    mdCell(`## ${e.title}\n\n**Task.** ${e.task}\n\n**Inputs.** ${e.inputs}\n\n**Assumptions.** ${e.assumptions}`),
    codeCell(e.code),
    mdCell(`**Expected output**\n\n\`\`\`\n${e.output}\n\`\`\`\n\n**Interpretation.** ${e.interpret}\n\n**Common mistakes**\n${e.mistakes.map((m) => `- ${m}`).join('\n')}`),
  ]);
  return JSON.stringify({
    cells: [mdCell('# Quant Camp: Python examples\nNumPy / SciPy examples from the Quiz 1 boot camp. Run each cell in order.'), ...cells],
    metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' } },
    nbformat: 4, nbformat_minor: 5,
  }, null, 1);
}

function Example({ e }: { e: PyExample }) {
  return (
    <article id={e.id} className="card card-pad grid gap-4 scroll-mt-20">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div><div className="eyebrow">Module {e.module}</div><h2 className="text-lg font-bold">{e.title}</h2></div>
        <button className="btn btn-sm no-print" onClick={() => download(`${e.id}.ipynb`, notebook([e]), 'application/x-ipynb+json')}><Icon name="download" size={15} />.ipynb</button>
      </header>
      <dl className="grid gap-2 text-sm md:grid-cols-3">
        <div><dt className="eyebrow">Task</dt><dd><Md>{e.task}</Md></dd></div>
        <div><dt className="eyebrow">Inputs</dt><dd><Md>{e.inputs}</Md></dd></div>
        <div><dt className="eyebrow">Assumptions</dt><dd><Md>{e.assumptions}</Md></dd></div>
      </dl>
      <CodeBlock code={e.code} explain={e.explain} output={e.output} />
      <div><div className="eyebrow mb-1">What it means</div><Md>{e.interpret}</Md></div>
      {e.mistakes.length > 0 && <div className="callout callout-warning"><div className="callout-title">Common mistakes</div><ul className="list-disc pl-5 text-sm grid gap-1">{e.mistakes.map((m, i) => <li key={i}><Md>{m}</Md></li>)}</ul></div>}
    </article>
  );
}

export default function PythonLab() {
  const mods = MODULES.filter((m) => PY_EXAMPLES.some((e) => e.module === m.id));
  const [mod, setMod] = useState<number | 'all'>('all');
  const shown = PY_EXAMPLES.filter((e) => mod === 'all' || e.module === mod);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Python Lab" title="NumPy & SciPy, step by step" actions={PY_EXAMPLES.length > 0 && <button className="btn" onClick={() => download('quant-camp-examples.ipynb', notebook(PY_EXAMPLES), 'application/x-ipynb+json')}><Icon name="download" size={16} />Download all as a notebook</button>}>
        Read the code line by line (click a line), copy it, or download a Jupyter notebook. The app doesn't run Python; the expected output is shown so you can check your own run.
      </PageHeader>
      {PY_EXAMPLES.length === 0 ? <Empty title="No examples yet">The Python examples are being prepared.</Empty> : (
        <>
          {mods.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Module filter">
              <button role="radio" aria-checked={mod === 'all'} className={`chip ${mod === 'all' ? 'chip-accent' : ''}`} onClick={() => setMod('all')}>All</button>
              {mods.map((m) => <button key={m.id} role="radio" aria-checked={mod === m.id} className={`chip ${mod === m.id ? 'chip-accent' : ''}`} onClick={() => setMod(m.id)}>{m.id}. {m.title}</button>)}
            </div>
          )}
          <div className="grid gap-5">{shown.map((e) => <Example key={e.id} e={e} />)}</div>
        </>
      )}
    </div>
  );
}
