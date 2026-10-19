// Mission Control: the countdown, what to do next, mastery and the three-day plan.
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, fmtDuration } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { LESSONS, MODULES, OBJECTIVES, QUESTIONS } from '../data';
import { levelOf } from '../lib/mastery';
import { bootCampSchedule, nextTasks } from '../lib/plan';
import { readiness } from '../lib/score';
import { accuracy, dueObjectives, masteryOf, moduleMastery, taskLink, weakest } from '../lib/summary';
import { examTime, useProgress } from '../store/progress';

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

function CountdownCard({ at }: { at: number }) {
  const now = useNow();
  const left = Math.max(0, at - now);
  const parts = [[Math.floor(left / 864e5), 'days'], [Math.floor((left / 36e5) % 24), 'hours'], [Math.floor((left / 6e4) % 60), 'min'], [Math.floor((left / 1e3) % 60), 'sec']] as const;
  const when = new Date(at).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div className="card card-pad grid gap-3">
      <div className="eyebrow">Quiz 1 countdown</div>
      {left > 0 ? (
        <div className="flex gap-3">
          {parts.map(([v, l]) => (
            <div key={l} className="grid text-center min-w-[56px] rounded-xl py-2" style={{ background: 'var(--surface-2)' }}>
              <b className="text-2xl tabular-nums">{String(v).padStart(2, '0')}</b><span className="text-[11px] text-muted font-semibold">{l}</span>
            </div>
          ))}
        </div>
      ) : <b className="text-xl">It's exam time. You've got this.</b>}
      <div className="text-sm text-muted">{when} · <Link to="/setup" className="underline">change</Link></div>
    </div>
  );
}

export default function Dashboard() {
  const st = useProgress();
  const now = Date.now();
  const at = examTime(st.setup);
  const tasks = nextTasks({ modules: MODULES, lessons: LESSONS, objectives: OBJECTIVES, states: st.objectives, lessonsDone: st.lessons, now, examAt: at, mockCount: st.mocks.length }, 5);
  const overall = masteryOf(st.objectives, OBJECTIVES.map((o) => o.id), now);
  const mods = moduleMastery(st.objectives, now).filter((m) => m.n > 0);
  const acc = accuracy(st.attempts);
  const due = dueObjectives(st.objectives, now);
  const weak = weakest(st.objectives, 5, now);
  const ready = readiness(st.mocks.map((m) => (100 * m.score) / Math.max(1, m.total)));
  const plan = bootCampSchedule(MODULES, LESSONS, { mon: st.setup.hoursMon, tue: st.setup.hoursTue, wedMin: st.setup.minutesWed });
  const resume = st.lastLesson && !st.lessons[st.lastLesson]?.done ? LESSONS.find((l) => l.id === st.lastLesson) : undefined;
  const primary = resume ? { to: `/learn/${resume.id}`, label: resume.title, verb: 'Resume' } : tasks[0] ? taskLink(tasks[0]) : LESSONS[0] ? { to: `/learn/${LESSONS[0].id}`, label: LESSONS[0].title, verb: 'Start' } : null;
  const lessonsDone = LESSONS.filter((l) => st.lessons[l.id]?.done).length;
  const today = new Date().getDay(); // 1 Mon, 2 Tue, 3 Wed

  const stats = [
    { label: 'Time studied', value: fmtDuration(st.studyMs), hint: 'from the focus timer' },
    { label: 'Questions answered', value: acc.n, hint: `${QUESTIONS.length} in the bank` },
    { label: 'First-try accuracy', value: acc.n ? `${Math.round(acc.pct)}%` : '–', hint: 'counts toward mastery' },
    { label: 'Reviews due', value: due.length, hint: 'spaced recall' },
    { label: 'Mock readiness', value: ready.level, hint: ready.passes ? `${ready.passes} mock${ready.passes > 1 ? 's' : ''} ≥ 80%` : 'two mocks ≥ 80% = ready' },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Mission Control" title={st.setup.done ? 'Welcome back, Divine' : 'Welcome to Quant Camp'}>
        {lessonsDone}/{LESSONS.length} lessons done · {st.stars} ★ earned
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <motion.div layout className="card card-pad grid gap-4" style={{ background: 'linear-gradient(135deg, var(--accent-soft), var(--surface))' }}>
          <div className="eyebrow">Up next</div>
          {primary ? (
            <>
              <div><div className="text-sm text-muted font-semibold">{primary.verb}</div><div className="text-xl font-extrabold">{primary.label}</div>
                {!resume && tasks[0] && <div className="text-sm text-muted mt-1">{tasks[0].reason}</div>}</div>
              <div><Link to={primary.to} className="btn btn-primary btn-lg">Continue studying <Icon name="arrow" /></Link></div>
            </>
          ) : <div className="text-muted">Lessons will appear here as soon as the content is loaded.</div>}
          <div className="grid gap-1.5">
            <div className="flex justify-between text-sm"><b>Overall mastery</b><span className="tabular-nums">{Math.round(overall)}% · {levelOf(overall)}</span></div>
            <Bar value={overall} />
          </div>
        </motion.div>
        <CountdownCard at={at} />
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {stats.map((s) => <div key={s.label} className="card card-pad grid gap-0.5"><span className="text-xs text-muted font-semibold">{s.label}</span><b className="text-xl capitalize tabular-nums">{s.value}</b><span className="text-[11px] text-muted">{s.hint}</span></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad grid gap-3">
          <h2 className="font-bold">Priorities</h2>
          {tasks.length === 0 && <p className="text-sm text-muted">Nothing queued. Try a mixed practice set or a mock exam.</p>}
          <ol className="grid gap-2">
            {tasks.map((t, i) => { const l = taskLink(t); return (
              <li key={i}><Link to={l.to} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--surface-2)]">
                <span className="chip">{l.verb}</span><span className="flex-1 min-w-0"><span className="font-semibold block truncate">{l.label}</span><span className="text-xs text-muted">{t.reason}</span></span><Icon name="arrow" size={16} />
              </Link></li>); })}
          </ol>
        </section>
        <section className="card card-pad grid gap-3 content-start">
          <h2 className="font-bold">Weakest topics</h2>
          {weak.length === 0 ? <p className="text-sm text-muted">Answer a few questions and your weakest topics will show up here.</p> : weak.map(({ o, score }) => (
            <Link key={o.id} to={`/quiz?obj=${encodeURIComponent(o.id)}&n=5`} className="grid gap-1 rounded-xl p-2 hover:bg-[var(--surface-2)]">
              <div className="flex justify-between text-sm"><span className="font-semibold">{o.title}</span><span className="text-muted tabular-nums">{Math.round(score)}%</span></div><Bar value={score} />
            </Link>))}
        </section>
      </div>

      <section className="card card-pad grid gap-3">
        <h2 className="font-bold">Mastery by module</h2>
        {mods.length === 0 ? <Empty title="No modules loaded yet" /> : (
          <div className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
            {mods.map(({ m, score }) => (
              <Link key={m.id} to={`/learn#m${m.id}`} className="grid gap-1">
                <div className="flex justify-between text-sm"><span><span className="text-muted">{m.id}.</span> {m.title}</span><span className="text-muted tabular-nums">{Math.round(score)}% · {levelOf(score)}</span></div>
                <Bar value={score} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="font-bold">Your three-day plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(['mon', 'tue'] as const).map((d, k) => { const p = plan[d]; return (
            <div key={d} className="card card-pad grid gap-2 content-start" style={today === k + 1 ? { borderColor: 'var(--accent)' } : undefined}>
              <div className="flex justify-between items-baseline"><b>{d === 'mon' ? 'Monday' : 'Tuesday'}</b><span className="text-xs text-muted">{Math.round(p.budget / 60 * 10) / 10} h available</span></div>
              {p.compressed && <div className="text-xs chip chip-warn">Tight: about {Math.round(p.need / 60 * 10) / 10} h of material, so lessons are trimmed to essentials.</div>}
              <ul className="grid gap-1 text-sm">{p.modules.map((m) => <li key={m.id} className="flex justify-between gap-2"><span>{m.title}</span><span className="text-muted tabular-nums">{m.minutes} min</span></li>)}</ul>
              <div className="text-sm font-semibold pt-1" style={{ borderTop: '1px solid var(--line)' }}>Then: {p.assessment}</div>
            </div>); })}
          <div className="card card-pad grid gap-2 content-start" style={today === 3 ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="flex justify-between items-baseline"><b>Wednesday (exam day)</b><span className="text-xs text-muted">{plan.wed.minutes} min</span></div>
            <ul className="grid gap-1 text-sm list-disc pl-5">{plan.wed.focus.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link to="/reference" className="btn btn-sm mt-1">Open the reference sheet</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
