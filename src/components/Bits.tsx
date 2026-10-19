// Small shared pieces: source citations, provenance badges, notebook markers,
// progress bars, the code block and helpers for downloads and the clipboard.
import { useState } from 'react';
import type { Provenance, SourceRef } from '../content/types';
import { citeSource } from '../data';
import { Icon } from './Icon';

export function Cite({ sources, label = 'Source' }: { sources?: SourceRef[]; label?: string }) {
  if (!sources?.length) return null;
  return (
    <div className="text-xs text-muted flex flex-wrap gap-x-3 gap-y-1 items-center">
      <span className="font-bold uppercase tracking-wide">{label}{sources.length > 1 ? 's' : ''}</span>
      {sources.map((s, i) => <span key={i}>{citeSource(s)}</span>)}
    </div>
  );
}

const PROV: Record<Provenance, { label: string; cls: string; tip: string }> = {
  slides: { label: 'From the slides', cls: 'chip-accent', tip: 'Stated in the course slides.' },
  explanation: { label: 'Explanation', cls: '', tip: 'An explanation written for this camp, consistent with the slides.' },
  clarification: { label: 'Clarification', cls: 'chip-warn', tip: 'Goes beyond or clarifies the slides.' },
};
export function ProvenanceBadge({ p }: { p?: Provenance }) {
  if (!p) return null;
  const v = PROV[p];
  return <span className={`chip ${v.cls}`} title={v.tip}>{v.label}</span>;
}

export function NotebookMark({ text = 'Copy this into your notebook' }: { text?: string }) {
  return <span className="notebook-mark"><Icon name="notebook" size={14} />{text}</span>;
}

export function Bar({ value, tone }: { value: number; tone?: 'good' | 'warn' | 'bad' }) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone ? `var(--${tone})` : v >= 80 ? 'var(--good)' : v >= 60 ? 'var(--accent)' : v >= 40 ? 'var(--warn)' : 'var(--bad)';
  return <div className="bar" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v}%`, background: color }} /></div>;
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text; document.body.append(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  }
}
export function download(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-sm no-print" onClick={async () => { if (await copyText(text)) { setDone(true); setTimeout(() => setDone(false), 1500); } }} aria-live="polite">
      <Icon name={done ? 'check' : 'copy'} size={15} />{done ? 'Copied' : label}
    </button>
  );
}

/** Code with line numbers. Click a line to read what it does (explain[i] belongs to line i, when given per line). */
export function CodeBlock({ code, explain, title, output }: { code: string; explain?: string[]; title?: string; output?: string }) {
  const lines = code.replace(/\n$/, '').split('\n');
  const perLine = !!explain && explain.length === lines.length;
  const [hl, setHl] = useState<number | null>(null);
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        {title ? <b className="text-sm">{title}</b> : <span />}
        <CopyButton text={code} label="Copy code" />
      </div>
      <pre className="code" aria-label={title || 'Code'}>
        {lines.map((l, i) => (
          <span key={i} className={`code-line${hl === i ? ' hl' : ''}`} onClick={() => perLine && setHl(hl === i ? null : i)}><span className="ln">{i + 1}</span>{l || ' '}{'\n'}</span>
        ))}
      </pre>
      {perLine && hl != null && explain![hl] && <div className="text-sm callout callout-tip"><b>Line {hl + 1}:</b> {explain![hl]}</div>}
      {perLine && hl == null && <p className="text-xs text-muted">Click a line to see what it does.</p>}
      {!perLine && explain && explain.length > 0 && <ul className="text-sm grid gap-1 list-disc pl-5" style={{ color: 'var(--ink-2)' }}>{explain.map((e, i) => <li key={i}>{e}</li>)}</ul>}
      {output && <div><div className="eyebrow mb-1">Output</div><pre className="code" style={{ opacity: 0.9 }}>{output}</pre></div>}
    </div>
  );
}

export const fmtDuration = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
