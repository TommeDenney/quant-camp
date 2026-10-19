// All interactive simulators, and a page for each.
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { LESSONS, moduleById } from '../data';
import Viz, { VIZ, vizMeta } from '../viz';

export function LabsIndex() {
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Simulators" title="Interactive labs">Move the sliders, predict, then check. Every lab has examples from the course and a Reset button.</PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VIZ.map((v) => (
          <Link key={v.id} to={`/labs/${v.id}`} className="card card-pad grid gap-1 hover:border-[var(--accent)] transition-colors">
            <span className="text-xs text-muted">Module {v.module} · {moduleById(v.module)?.title}</span>
            <b>{v.title}</b>
            <span className="text-sm text-muted">{v.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function LabPage() {
  const { id = '' } = useParams();
  const m = vizMeta(id);
  if (!m) return <Empty title="Simulator not found"><Link className="underline" to="/labs">All simulators</Link></Empty>;
  const related = LESSONS.filter((l) => [...l.visual, ...l.interact, ...l.plain, ...l.worked].some((b) => b.kind === 'viz' && b.id === m.id));
  return (
    <div className="grid gap-4">
      <Link to="/labs" className="text-sm text-muted inline-flex items-center gap-1 hover:underline"><Icon name="back" size={14} />All simulators</Link>
      <Viz id={m.id} />
      {related.length > 0 && <div className="flex flex-wrap gap-2 items-center text-sm"><span className="text-muted">Used in:</span>{related.map((l) => <Link key={l.id} className="chip chip-accent" to={`/learn/${l.id}`}>{l.title}</Link>)}</div>}
    </div>
  );
}
