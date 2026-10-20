// The ten-step lesson player. Steps without content are skipped; progress, the
// current step, bookmarks and notes are saved, so a lesson can be resumed.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, Cite, NotebookMark } from '../components/Bits';
import { Blocks } from '../components/Blocks';
import { Icon } from '../components/Icon';
import { Empty } from '../components/Layout';
import { Md } from '../components/Md';
import { QuestionCard } from '../components/QuestionCard';
import { celebrate, toast } from '../components/Reward';
import type { Block, Lesson, Question } from '../content/types';
import { LESSONS, lessonForObjective, moduleById, MODULES, objectiveById, QUESTIONS, questionById } from '../data';
import { currentScore, emptyState, ladderFor } from '../lib/mastery';
import { pick } from '../lib/select';
import { hoursLeft, useProgress } from '../store/progress';

const STEPS = [
  { key: 'why', label: 'Why it matters' }, { key: 'prereq', label: 'Prerequisite' }, { key: 'plain', label: 'In plain English' },
  { key: 'visual', label: 'See it' }, { key: 'worked', label: 'Worked example' }, { key: 'interact', label: 'Try it' },
  { key: 'check', label: 'Quick check' }, { key: 'mistakes', label: 'Common mistakes' }, { key: 'takeaway', label: 'Key takeaway' }, { key: 'recall', label: 'Recall plan' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

function checkQuestions(l: Lesson) {
  const listed = l.check.map(questionById).filter((q): q is Question => !!q);
  return listed.length ? listed : QUESTIONS.filter((q) => l.objectives.includes(q.objective)).slice(0, 3);
}
function mistakesOf(l: Lesson, qs: Question[]) {
  const pool = [...qs, ...QUESTIONS.filter((q) => l.objectives.includes(q.objective))];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of pool) for (const m of q.misconceptions || []) if (!seen.has(m)) { seen.add(m); out.push(m); }
  const warn = [...l.plain, ...l.worked, ...l.visual].filter((b): b is Extract<Block, { kind: 'callout' }> => b.kind === 'callout' && (b.tone === 'warning' || b.tone === 'erratum')).map((b) => b.md);
  return { list: out.slice(0, 6), warn };
}

function CheckStep({ qs, onAllDone }: { qs: Question[]; onAllDone: (score: number) => void }) {
  const seen = useProgress((s) => s.seen);
  const [queue, setQueue] = useState(qs);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  if (!queue.length) return <p className="text-muted text-sm">No check questions for this lesson yet.</p>;
  if (i >= queue.length) return <div className="card card-pad feedback-good"><b>Check complete: {score}/{queue.length} on the first try.</b></div>;
  const another = (q: Question) => {
    const [n] = pick(QUESTIONS.filter((x) => x.objective === q.objective && !queue.some((y) => y.id === x.id)), 1, seen);
    if (n) { setQueue([...queue.slice(0, i + 1), n, ...queue.slice(i + 1)]); setI(i + 1); } else toast({ tone: 'info', title: 'No other question on this yet', body: 'Re-read the explanation, then try again.' });
  };
  return (
    <div className="grid gap-2">
      <div className="text-xs text-muted">Question {i + 1} of {queue.length}</div>
      <QuestionCard key={queue[i].id} q={queue[i]} onAnother={another} onOutcome={(o) => o.correct && setScore((s) => s + 1)}
        onNext={() => { const n = i + 1; setI(n); if (n >= queue.length) onAllDone(score); }} nextLabel={i + 1 < queue.length ? 'Next question' : 'Finish the check'} />
    </div>
  );
}

export default function LessonPlayer() {
  const { id = '' } = useParams();
  return <LessonSession key={id} id={id} />;
}

function LessonSession({ id }: { id: string }) {
  const nav = useNavigate();
  const lesson = LESSONS.find((l) => l.id === id);
  const st = useProgress();
  const saved = st.lessons[id];
  const qs = useMemo(() => (lesson ? checkQuestions(lesson) : []), [id]);
  const content: Record<StepKey, boolean> = useMemo(() => {
    if (!lesson) return {} as Record<StepKey, boolean>;
    const m = mistakesOf(lesson, qs);
    return { why: !!lesson.why.length, prereq: !!lesson.prereq.length, plain: !!lesson.plain.length, visual: !!lesson.visual.length, worked: !!lesson.worked.length, interact: !!lesson.interact.length,
      check: qs.length > 0, mistakes: m.list.length + m.warn.length > 0, takeaway: !!lesson.takeaway, recall: true };
  }, [id]);
  const steps = STEPS.map((s, i) => ({ ...s, i })).filter((s) => content[s.key]);
  const [pos, setPos] = useState(() => Math.max(0, steps.findIndex((s) => s.i === (saved?.done ? 0 : saved?.step ?? 0))));
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => { if (lesson) st.lessonStep(lesson.id, steps[pos]?.i ?? 0); }, [pos, id]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pos]);

  if (!lesson) return <Empty title="Lesson not found"><Link className="underline" to="/learn">Back to all lessons</Link></Empty>;
  const mod = moduleById(lesson.module);
  const step = steps[pos];
  const states = st.objectives;
  const struggling = lesson.objectives.filter((o) => (states[o]?.attempts || 0) >= 2 && currentScore(states[o]) < 45);
  const prereqObjs = [...new Set(lesson.objectives.flatMap((o) => objectiveById(o)?.prereqs || []))];
  const order = MODULES.flatMap((m) => m.lessons);
  const nextLesson = LESSONS.find((l) => l.id === order[order.indexOf(lesson.id) + 1]);
  const bookmarked = st.bookmarks.includes(lesson.id);
  const mistakes = mistakesOf(lesson, qs);
  const ladder = ladderFor(hoursLeft(st.setup));

  const finish = () => {
    const first = !saved?.done;
    st.lessonStep(lesson.id, 9, true);
    if (first) { st.addStars(5); celebrate('big'); toast({ tone: 'good', title: 'Lesson complete (+5 ★)', body: lesson.title }); }
    nav(nextLesson ? `/learn/${nextLesson.id}` : '/learn');
  };

  const body = (k: StepKey) => {
    switch (k) {
      case 'why': return <Blocks blocks={lesson.why} />;
      case 'prereq': return (
        <div className="grid gap-4">
          <Blocks blocks={lesson.prereq} />
          {prereqObjs.length > 0 && <div className="flex flex-wrap gap-2 items-center text-sm"><span className="text-muted">Builds on:</span>{prereqObjs.map((o) => { const l = lessonForObjective(o); return l ? <Link key={o} to={`/learn/${l.id}`} className="chip chip-accent">{objectiveById(o)?.title || l.title}</Link> : <span key={o} className="chip">{objectiveById(o)?.title || o}</span>; })}</div>}
        </div>);
      case 'plain': return <Blocks blocks={lesson.plain} />;
      case 'visual': return <Blocks blocks={lesson.visual} />;
      case 'worked': return <Blocks blocks={lesson.worked} />;
      case 'interact': return <Blocks blocks={lesson.interact} />;
      case 'check': return <CheckStep qs={qs} onAllDone={() => setTimeout(() => setPos((p) => Math.min(steps.length - 1, p + 1)), 400)} />;
      case 'mistakes': return (
        <div className="grid gap-3">
          {mistakes.warn.map((w, i) => <div key={i} className="callout callout-warning"><Md>{w}</Md></div>)}
          {mistakes.list.length > 0 && <ul className="grid gap-2">{mistakes.list.map((m, i) => <li key={i} className="card card-pad flex gap-3"><Icon name="x" className="flex-none mt-0.5" /><Md>{m}</Md></li>)}</ul>}
        </div>);
      case 'takeaway': return (
        <div className="card card-pad grid gap-2" style={{ borderColor: 'var(--accent)', background: 'var(--accent-soft)' }}>
          <NotebookMark />
          <Md className="text-lg font-semibold">{lesson.takeaway}</Md>
        </div>);
      case 'recall': return (
        <div className="grid gap-3">
          <p>You'll see these again, at increasing intervals, so they stick until the exam:</p>
          <ul className="grid gap-2">
            {lesson.objectives.map((o) => { const s = states[o] || emptyState(); return (
              <li key={o} className="card card-pad grid gap-1.5">
                <div className="flex justify-between text-sm"><b>{objectiveById(o)?.title || o}</b><span className="text-muted">{s.dueAt ? `review ${new Date(s.dueAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : 'not practised yet'}</span></div>
                <Bar value={currentScore(s)} />
              </li>); })}
          </ul>
          <p className="text-sm text-muted">Review ladder right now: {ladder.map((h) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h)} h`)).join(' → ')}.</p>
        </div>);
    }
  };

  return (
    <div className="grid gap-5 max-w-3xl mx-auto">
      <header className="grid gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/learn" className="text-muted hover:underline inline-flex items-center gap-1"><Icon name="back" size={14} />{mod ? `${mod.id}. ${mod.title}` : 'Lessons'}</Link>
          <span className="ml-auto flex gap-1 no-print">
            <button className="btn btn-sm btn-ghost" onClick={() => setNotesOpen((v) => !v)} aria-expanded={notesOpen}><Icon name="notes" size={15} />Notes</button>
            <button className="btn btn-sm btn-ghost" aria-pressed={bookmarked} onClick={() => st.toggleBookmark(lesson.id)} style={{ color: bookmarked ? 'var(--warn)' : undefined }}><Icon name="bookmark" size={15} />{bookmarked ? 'Saved' : 'Bookmark'}</button>
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{lesson.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{lesson.minutes} min</span>
          <Link to={`/quiz?obj=${lesson.objectives.map(encodeURIComponent).join(',')}&n=5&lesson=${lesson.id}`} className="btn btn-sm">I know this: test me</Link>
        </div>
        <Cite sources={lesson.sources} />
      </header>

      {struggling.length > 0 && prereqObjs.length > 0 && (
        <div className="callout callout-tip text-sm"><div className="callout-title">Finding this hard?</div>
          It often helps to revisit what it builds on: {prereqObjs.map((o) => { const l = lessonForObjective(o); return l ? <Link key={o} to={`/learn/${l.id}`} className="underline mr-2">{l.title}</Link> : null; })}
        </div>
      )}

      <AnimatePresence>
        {notesOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <label className="field"><span>Your notes for this lesson (saved automatically)</span>
              <textarea className="input min-h-[110px]" value={st.notes[lesson.id] || ''} onChange={(e) => st.setNote(lesson.id, e.target.value)} placeholder="Anything you want to remember or ask about…" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>

      <nav aria-label="Lesson steps" className="flex gap-1.5 overflow-x-auto pb-1 no-print">
        {steps.map((s, k) => (
          <button key={s.key} onClick={() => setPos(k)} aria-current={k === pos ? 'step' : undefined} title={s.label}
            className="flex-1 min-w-[38px] grid gap-1 text-left rounded-lg px-1.5 py-1 text-[11px] font-semibold" style={{ color: k === pos ? 'var(--accent)' : 'var(--muted)' }}>
            <span className="h-1.5 rounded-full" style={{ background: k < pos ? 'var(--accent)' : k === pos ? 'var(--accent)' : 'var(--surface-3)', opacity: k < pos ? 0.55 : 1 }} />
            <span className="hidden lg:block truncate">{s.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section key={step.key} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} className="grid gap-4">
          <div className="eyebrow">Step {step.i + 1} of 10 · {step.label}</div>
          {body(step.key)}
        </motion.section>
      </AnimatePresence>

      <footer className="flex items-center gap-2 pt-2 no-print" style={{ borderTop: '1px solid var(--line)' }}>
        <button className="btn" disabled={pos === 0} onClick={() => setPos(pos - 1)}><Icon name="back" size={16} />Back</button>
        <span className="text-xs text-muted mx-auto">{pos + 1} / {steps.length}</span>
        {pos < steps.length - 1
          ? <button className="btn btn-primary" onClick={() => setPos(pos + 1)}>Next<Icon name="arrow" size={16} /></button>
          : <button className="btn btn-primary" onClick={finish}><Icon name="check" size={16} />{nextLesson ? 'Finish & next lesson' : 'Finish lesson'}</button>}
      </footer>
    </div>
  );
}
