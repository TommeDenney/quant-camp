// A practice session built from the URL:
//   ?obj=a,b&n=5 · ?module=3&n=10 · ?mode=mixed&n=20 · ?mode=due · ?mode=missed
//   &delayed=1 marks the attempts as delayed reviews; &lesson=id ("I know this") marks
//   the lesson done on a strong result.
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty } from '../components/Layout';
import { QuestionCard, type Outcome } from '../components/QuestionCard';
import { celebrate, toast } from '../components/Reward';
import type { Question } from '../content/types';
import { lessonById, moduleById, objectiveById, QUESTIONS, questionById } from '../data';
import { pick, recentlyMissed } from '../lib/select';
import { dueObjectives } from '../lib/summary';
import { useProgress } from '../store/progress';

function build(params: URLSearchParams, seen: Record<string, number>, st: ReturnType<typeof useProgress.getState>) {
  const n = Math.max(1, Math.min(60, +(params.get('n') || 0) || 10));
  const mode = params.get('mode');
  if (params.get('obj')) {
    const objs = params.get('obj')!.split(',').filter(Boolean);
    return { title: objs.length === 1 ? objectiveById(objs[0])?.title || 'Topic check' : 'Topic check', qs: pick(QUESTIONS.filter((q) => objs.includes(q.objective)), n, seen) };
  }
  if (params.get('module') != null) {
    const m = +params.get('module')!;
    return { title: `Module ${m} assessment${moduleById(m) ? `: ${moduleById(m)!.title}` : ''}`, qs: pick(QUESTIONS.filter((q) => q.module === m), n, seen) };
  }
  if (mode === 'due') {
    const due = dueObjectives(st.objectives);
    return { title: 'Spaced review', qs: due.flatMap((o) => pick(QUESTIONS.filter((q) => q.objective === o), 1, seen)).slice(0, Math.max(n, due.length)) };
  }
  if (mode === 'missed') {
    const missed = recentlyMissed(st.attempts).map(questionById).filter((q): q is Question => !!q);
    // Prefer a fresh question on the same objective; fall back to the same question.
    const used = new Set<string>();
    const qs = missed.flatMap((q) => {
      const [alt] = pick(QUESTIONS.filter((x) => x.objective === q.objective && x.id !== q.id && !used.has(x.id)), 1, seen);
      const r = alt || q;
      if (used.has(r.id)) return [];
      used.add(r.id);
      return [r];
    });
    return { title: 'Recently missed', qs: qs.slice(0, Math.max(n, 10)) };
  }
  return { title: 'Mixed practice', qs: pick(QUESTIONS, n, seen) };
}

export default function Quiz() {
  const [params] = useSearchParams();
  return <QuizSession key={params.toString()} params={params} />;
}

function QuizSession({ params }: { params: URLSearchParams }) {
  const st = useProgress();
  const { title, qs: initial } = useMemo(() => build(params, useProgress.getState().seen, useProgress.getState()), [params.toString()]);
  const [queue, setQueue] = useState<Question[]>(initial);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Record<string, Outcome>>({});
  const delayed = params.get('delayed') === '1';
  const lessonId = params.get('lesson');

  if (!queue.length) return <Empty title="No questions available for this yet">{QUESTIONS.length ? 'Try another topic or a mixed set.' : 'The question bank is being prepared.'} <Link className="underline" to="/practice">Back to practice</Link></Empty>;

  const done = i >= queue.length;
  const outcomes = Object.values(results);
  const correct = outcomes.filter((o) => o.correct).length;
  const pct = outcomes.length ? (100 * correct) / outcomes.length : 0;

  const finish = () => {
    setI(queue.length);
    const c = Object.values(results).filter((o) => o.correct).length, t = Object.values(results).length;
    const p = t ? c / t : 0;
    if (p >= 0.8 && t >= 3) celebrate(p === 1 ? 'big' : 'small');
    if (lessonId && p >= 0.8 && lessonById(lessonId)) { st.lessonStep(lessonId, 9, true); toast({ tone: 'good', title: 'Lesson marked as known', body: lessonById(lessonId)!.title }); }
  };
  const another = (q: Question) => {
    const [n] = pick(QUESTIONS.filter((x) => x.objective === q.objective && !queue.some((y) => y.id === x.id)), 1, st.seen);
    if (n) { setQueue([...queue.slice(0, i + 1), n, ...queue.slice(i + 1)]); setI(i + 1); }
    else toast({ tone: 'info', title: 'No other question on this objective yet', body: 'Review the linked lesson, then try again.' });
  };

  if (done) {
    const missed = queue.filter((q) => results[q.id] && !results[q.id].correct);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto grid gap-5">
        <div className="card card-pad grid gap-3 text-center">
          <div className="eyebrow">{title}</div>
          <div className="text-5xl font-black tabular-nums">{correct}/{outcomes.length}</div>
          <div className="text-muted">{pct >= 80 ? 'Strong work. This topic is sticking.' : pct >= 60 ? 'Getting there. One more pass on the misses will help.' : 'This one needs another look. That is exactly what practice is for.'}</div>
          <Bar value={pct} />
        </div>
        {missed.length > 0 && (
          <div className="card card-pad grid gap-2">
            <b>To revisit</b>
            {missed.map((q) => <div key={q.id} className="flex justify-between gap-2 text-sm"><span>{objectiveById(q.objective)?.title || q.topic}</span><Link className="underline" to={`/quiz?obj=${encodeURIComponent(q.objective)}&n=3`}>practise</Link></div>)}
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-center">
          <Link className="btn btn-primary" to="/">Back to Mission Control</Link>
          <Link className="btn" to="/practice">More practice</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto grid gap-4">
      <div className="flex items-center gap-3">
        <Link to="/practice" className="btn btn-sm btn-ghost" aria-label="Leave session"><Icon name="back" size={16} /></Link>
        <div className="flex-1 grid gap-1">
          <div className="flex justify-between text-sm"><b className="truncate">{title}</b><span className="text-muted tabular-nums">{i + 1} / {queue.length}</span></div>
          <Bar value={(100 * i) / queue.length} tone="good" />
        </div>
      </div>
      <QuestionCard key={queue[i].id + i} q={queue[i]} delayed={delayed} onAnother={another}
        onOutcome={(o) => setResults((r) => ({ ...r, [queue[i].id]: o }))}
        onNext={() => (i + 1 >= queue.length ? finish() : setI(i + 1))} nextLabel={i + 1 >= queue.length ? 'See results' : 'Next question'} />
    </div>
  );
}
