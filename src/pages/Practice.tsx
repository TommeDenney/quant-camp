// Practice hub: topic checks, module assessments, mixed sets, due reviews and recent misses.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { MODULES, OBJECTIVES, QUESTIONS } from '../data';
import { isExamQuestion, recentlyMissed } from '../lib/select';
import { dueObjectives } from '../lib/summary';
import { useProgress } from '../store/progress';

function Card({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return <section className="card card-pad grid gap-3 content-start"><div><h2 className="font-bold">{title}</h2><p className="text-sm text-muted">{desc}</p></div>{children}</section>;
}

export default function Practice() {
  const { objectives, attempts } = useProgress();
  const objs = OBJECTIVES.filter((o) => QUESTIONS.some((q) => q.objective === o.id));
  const mods = MODULES.filter((m) => QUESTIONS.some((q) => q.module === m.id));
  const [obj, setObj] = useState(objs[0]?.id || '');
  const [mod, setMod] = useState(mods[0]?.id ?? 0);
  const due = dueObjectives(objectives);
  const missed = recentlyMissed(attempts);
  if (!QUESTIONS.length) return <><PageHeader eyebrow="Practice" title="Practice" /><Empty title="No questions yet">The question bank is being prepared.</Empty></>;
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Practice" title="Practice">Short sets with instant feedback. Your first answer to each question counts toward mastery; hints and retries are free for learning.</PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Topic check" desc="5 questions on one learning objective.">
          <select className="input" value={obj} onChange={(e) => setObj(e.target.value)} aria-label="Objective">
            {mods.map((m) => <optgroup key={m.id} label={`${m.id}. ${m.title}`}>{objs.filter((o) => o.module === m.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</optgroup>)}
          </select>
          <Link className="btn btn-primary justify-self-start" to={`/quiz?obj=${encodeURIComponent(obj)}&n=5`}>Start topic check</Link>
        </Card>
        <Card title="Module assessment" desc="10 questions across a whole module.">
          <select className="input" value={mod} onChange={(e) => setMod(+e.target.value)} aria-label="Module">
            {mods.map((m) => <option key={m.id} value={m.id}>{m.id}. {m.title}</option>)}
          </select>
          <Link className="btn btn-primary justify-self-start" to={`/quiz?module=${mod}&n=10`}>Start module assessment</Link>
        </Card>
        <Card title="Mixed practice" desc="20 questions from everything, least-seen first: the best way to practise choosing the right method.">
          <Link className="btn btn-primary justify-self-start" to="/quiz?mode=mixed&n=20">Start mixed set</Link>
        </Card>
        <Card title="Reviews due" desc="Spaced recall of topics you've practised: the questions come back just before you'd forget them.">
          {due.length ? <Link className="btn btn-primary justify-self-start" to="/quiz?mode=due&delayed=1">Review {due.length} topic{due.length > 1 ? 's' : ''}</Link> : <p className="text-sm text-muted">Nothing due right now.</p>}
        </Card>
        <Card title="Recently missed" desc="Fresh attempts at questions you got wrong in the last three days.">
          {missed.length ? <Link className="btn btn-primary justify-self-start" to="/quiz?mode=missed">Retry {missed.length} question{missed.length > 1 ? 's' : ''}</Link> : <p className="text-sm text-muted">No recent misses.</p>}
        </Card>
        <Card title="Mock exam" desc={`Timed, multiple choice only, like the real quiz (${QUESTIONS.filter(isExamQuestion).length} exam-style questions in the bank).`}>
          <Link className="btn justify-self-start" to="/mock"><Icon name="mock" size={16} />Go to mock exams</Link>
        </Card>
      </div>
    </div>
  );
}
