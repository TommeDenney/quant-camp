// "Where to look in your notes": the slides and reference section for a question.
// The exam is open-note, so knowing where to look matters as much as the answer.
import { Link } from 'react-router-dom';
import type { Question } from '../content/types';
import { citeSource } from '../data';
import { refForModule } from '../lib/notes';
import { Icon } from './Icon';

export function WhereToLook({ q }: { q: Question }) {
  const ref = refForModule(q.module);
  return (
    <div className="rounded-xl p-3 grid gap-1.5 text-sm" style={{ background: 'var(--surface-2)' }}>
      <div className="flex items-center gap-2 font-bold"><Icon name="notebook" size={16} />Where to look in your notes</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">{q.source.map((s, i) => <span key={i}>{citeSource(s)}</span>)}</div>
      {ref && <div>Reference sheet: <Link to={`/reference?s=${ref.id}`} className="underline font-semibold">{ref.title}</Link></div>}
    </div>
  );
}
