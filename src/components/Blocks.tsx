// Renders lesson blocks: text, math, callouts, simulators, predictions, step lists,
// code and derivations.
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { Block } from '../content/types';
import Viz from '../viz';
import { CodeBlock, NotebookMark, ProvenanceBadge } from './Bits';
import { MathBlock, Md, MdInline } from './Md';

const CALLOUT: Record<string, string> = { tip: 'Tip', warning: 'Watch out', professor: 'From the professor', erratum: 'Correction to the slides' };

function Predict({ b }: { b: Extract<Block, { kind: 'predict' }> }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="card card-pad grid gap-3">
      <div className="eyebrow">Predict first</div>
      <Md>{b.prompt}</Md>
      <div className="grid gap-2">
        {b.options.map((o, i) => (
          <button key={i} className={`choice${pick == null ? '' : i === b.answer ? ' correct' : i === pick ? ' wrong' : ''}`} disabled={pick != null} onClick={() => setPick(i)}>
            <span className="key">{String.fromCharCode(65 + i)}</span><MdInline>{o}</MdInline>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {pick != null && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-3 ${pick === b.answer ? 'feedback-good' : 'feedback-bad'}`}>
            <b>{pick === b.answer ? 'Good prediction.' : 'Not quite, and that is what makes it memorable.'}</b>
            <Md>{b.reveal}</Md>
          </motion.div>
        )}
      </AnimatePresence>
      {pick != null && b.viz && <Viz id={b.viz} />}
    </div>
  );
}

export function BlockView({ b }: { b: Block }) {
  switch (b.kind) {
    case 'text':
      return <div className="grid gap-1.5">{b.provenance && b.provenance !== 'slides' && <div><ProvenanceBadge p={b.provenance} /></div>}<Md>{b.md}</Md></div>;
    case 'math':
      return <div className="card card-pad grid gap-1"><NotebookMark /><MathBlock tex={b.tex} caption={b.caption} /></div>;
    case 'callout':
      return <div className={`callout callout-${b.tone}`}><div className="callout-title">{CALLOUT[b.tone]}</div><Md>{b.md}</Md></div>;
    case 'viz':
      return <figure className="grid gap-2"><Viz id={b.id} preset={b.preset} />{b.caption && <figcaption className="text-sm text-muted">{b.caption}</figcaption>}</figure>;
    case 'predict':
      return <Predict b={b} />;
    case 'steps':
      return (
        <div className="card card-pad grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><b>{b.title}</b><NotebookMark /></div>
          <ol className="grid gap-3">
            {b.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="w-7 h-7 rounded-lg grid place-items-center text-sm font-bold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{i + 1}</span>
                <div className="min-w-0"><Md>{s.md}</Md>{s.tex && <MathBlock tex={s.tex} />}</div>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'code':
      return <div className="card card-pad"><CodeBlock code={b.code} explain={b.explain} title={b.title} output={b.output} /></div>;
    case 'derivation':
      return (
        <details className="card card-pad">
          <summary className="cursor-pointer font-semibold">Derivation: {b.title} <span className="text-xs text-muted">(optional)</span></summary>
          <div className="mt-3"><Md>{b.md}</Md></div>
        </details>
      );
    default:
      return null;
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return <div className="grid gap-4">{blocks.map((b, i) => <BlockView key={i} b={b} />)}</div>;
}
