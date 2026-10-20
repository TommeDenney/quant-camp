// Mock exams: timed, multiple choice only, scored at the end like the real quiz.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { Md, MdInline } from '../components/Md';
import { celebrate } from '../components/Reward';
import type { Question } from '../content/types';
import { lessonForObjective, objectiveById, QUESTIONS, questionById } from '../data';
import { mockSummary, readiness, scoreAnswer, type Response } from '../lib/score';
import { choiceOrder, isExamQuestion, mockSet } from '../lib/select';
import { useProgress, type MockResult } from '../store/progress';

const KINDS = [
  { id: 'standard', label: 'Standard mock', n: 40, minutes: 60, desc: '40 questions · 60 minutes' },
  { id: 'long', label: 'Long mock', n: 60, minutes: 90, desc: '60 questions · 90 minutes' },
  { id: 'sprint', label: 'Sprint', n: 15, minutes: 20, desc: '15 questions · 20 minutes' },
];

function Run({ qs, minutes, onSubmit }: { qs: Question[]; minutes: number; onSubmit: (r: Record<string, Response>) => void }) {
  const [i, setI] = useState(0);
  const [resp, setResp] = useState<Record<string, Response>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const end = useRef(Date.now() + minutes * 60_000);
  const [now, setNow] = useState(Date.now());
  const submitted = useRef(false);
  const submit = () => { if (!submitted.current) { submitted.current = true; onSubmit(resp); } };
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = Math.max(0, end.current - now);
  useEffect(() => { if (left <= 0) submit(); }, [left <= 0]);
  const q = qs[i];
  const choices = q.type === 'tf' ? (q.choices?.length ? q.choices : ['True', 'False']) : q.choices || [];
  const displayOrder = choiceOrder(q);
  const r = resp[q.id];
  const set = (v: Response) => setResp({ ...resp, [q.id]: v });
  const answered = qs.filter((x) => resp[x.id] != null && !(Array.isArray(resp[x.id]) && !(resp[x.id] as number[]).length)).length;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length) { const stored = displayOrder[n - 1]; if (q.type === 'multi') { const a = Array.isArray(r) ? r : []; set(a.includes(stored) ? a.filter((x) => x !== stored) : [...a, stored]); } else set(stored); }
      if (e.key === 'ArrowRight') setI((k) => Math.min(qs.length - 1, k + 1));
      if (e.key === 'ArrowLeft') setI((k) => Math.max(0, k - 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_250px] items-start">
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <b>Question {i + 1} of {qs.length}</b>
          <span className={`chip ml-auto tabular-nums font-bold ${left < 5 * 60_000 ? 'chip-bad' : ''}`} role="timer" aria-label="Mock exam time remaining"><Icon name="mock" size={14} />{mm}:{String(ss).padStart(2, '0')}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} data-qid={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }} className="card card-pad grid gap-4">
            <div className="text-xs text-muted">{q.type === 'multi' ? 'Select all that apply.' : 'Choose one answer.'}</div>
            <Md className="text-[1.05rem]">{q.prompt}</Md>
            <div className="grid gap-2">
              {displayOrder.map((k, position) => {
                const sel = Array.isArray(r) ? r.includes(k) : r === k;
                return (
                  <button key={k} className={`choice${sel ? ' selected' : ''}`} role={q.type === 'multi' ? 'checkbox' : 'radio'} aria-checked={sel}
                    onClick={() => (q.type === 'multi' ? set(Array.isArray(r) ? (r.includes(k) ? r.filter((x) => x !== k) : [...r, k]) : [k]) : set(k))}>
                    <span className="key">{q.type === 'multi' ? (sel ? '✓' : '') : String.fromCharCode(65 + position)}</span><MdInline>{choices[k]}</MdInline>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-2 items-center">
          <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="back" size={16} />Previous</button>
          <button className="btn btn-ghost" aria-pressed={flags.has(q.id)} onClick={() => { const f = new Set(flags); if (f.has(q.id)) f.delete(q.id); else f.add(q.id); setFlags(f); }} style={{ color: flags.has(q.id) ? 'var(--warn)' : undefined }}><Icon name="flag" size={16} />{flags.has(q.id) ? 'Flagged' : 'Flag'}</button>
          {i < qs.length - 1 ? <button className="btn btn-primary ml-auto" onClick={() => setI(i + 1)}>Next<Icon name="arrow" size={16} /></button>
            : <button className="btn btn-primary ml-auto" onClick={() => { if (answered < qs.length && !confirm(`${qs.length - answered} unanswered. Submit anyway?`)) return; submit(); }}>Submit exam</button>}
        </div>
      </div>
      <aside className="card card-pad grid gap-3 lg:sticky lg:top-20">
        <div className="text-sm"><b>{answered}</b> of {qs.length} answered</div>
        <div className="grid grid-cols-8 lg:grid-cols-5 gap-1.5">
          {qs.map((x, k) => {
            const a = resp[x.id] != null && !(Array.isArray(resp[x.id]) && !(resp[x.id] as number[]).length);
            return <button key={x.id} onClick={() => setI(k)} aria-label={`Question ${k + 1}${a ? ', answered' : ''}${flags.has(x.id) ? ', flagged' : ''}`} className="h-8 rounded-lg text-xs font-bold tabular-nums"
              style={{ background: k === i ? 'var(--accent)' : a ? 'var(--accent-soft)' : 'var(--surface-2)', color: k === i ? 'var(--accent-ink)' : 'var(--ink-2)', outline: flags.has(x.id) ? '2px solid var(--warn)' : undefined }}>{k + 1}</button>;
          })}
        </div>
        <button className="btn btn-sm" onClick={() => { if (confirm('Submit the exam now?')) submit(); }}>Submit now</button>
        <p className="text-xs text-muted">Keys: 1–{Math.max(2, choices.length)} choose · ← → move</p>
      </aside>
    </div>
  );
}

function Results({ m, onClose }: { m: MockResult & { responses: Record<string, Response> }; onClose: () => void }) {
  const mocks = useProgress((s) => s.mocks);
  const qs = m.qids.map(questionById).filter((q): q is Question => !!q);
  const pct = (100 * m.score) / Math.max(1, m.total);
  const ready = readiness(mocks.map((x) => (100 * x.score) / Math.max(1, x.total)), mocks.map((x) => x.qids));
  const topics = Object.entries(m.byTopic).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  const weak = topics.filter(([, [c, t]]) => c / t < 0.8).map(([k]) => k);
  const missed = qs.filter((q) => m.missed.includes(q.id));
  const nextObj = missed[0]?.objective;
  return (
    <div className="grid gap-5">
      <div className="card card-pad grid gap-3 md:grid-cols-[auto_1fr] items-center">
        <div className="text-center px-6"><div className="text-5xl font-black tabular-nums">{Math.round(pct)}%</div><div className="text-sm text-muted">{m.score}/{m.total} correct</div></div>
        <div className="grid gap-2">
          <div><b>{pct >= 80 ? 'Above the 80% mark.' : pct >= 70 ? 'Close to the 80% mark.' : 'Below the 80% mark for now.'}</b> Readiness: <span className="chip">{ready.level}</span> ({ready.passes} mock{ready.passes === 1 ? '' : 's'} at 80% or more; two in a row on different question sets means ready).</div>
          <Bar value={pct} />
          <div className="flex flex-wrap gap-2">
            {nextObj && <Link className="btn btn-primary btn-sm" to={`/quiz?mode=missed`}>Next session: retry what you missed</Link>}
            <button className="btn btn-sm" onClick={onClose}>Back to mock exams</button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card card-pad grid gap-2 content-start">
          <h2 className="font-bold">Accuracy by topic</h2>
          {topics.map(([t, [c, n]]) => <div key={t} className="grid gap-1"><div className="flex justify-between text-sm"><span>{t}</span><span className="text-muted tabular-nums">{c}/{n}</span></div><Bar value={(100 * c) / n} /></div>)}
        </section>
        <section className="card card-pad grid gap-2 content-start">
          <h2 className="font-bold">Topics to revise</h2>
          {weak.length ? <ul className="grid gap-1.5">{weak.map((t) => { const q = qs.find((x) => x.topic === t); const l = q && lessonForObjective(q.objective); return <li key={t} className="flex justify-between text-sm gap-2"><span>{t}</span>{l && <Link className="underline" to={`/learn/${l.id}`}>lesson</Link>}</li>; })}</ul> : <p className="text-sm text-muted">No weak topics in this mock. Nice.</p>}
        </section>
      </div>
      {missed.length > 0 && (
        <section className="grid gap-3">
          <h2 className="font-bold">Missed questions ({missed.length})</h2>
          {missed.map((q) => {
            const r = m.responses[q.id];
            const choices = q.type === 'tf' ? (q.choices?.length ? q.choices : ['True', 'False']) : q.choices || [];
            const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
            const mine = Array.isArray(r) ? r : typeof r === 'number' ? [r] : [];
            const why = mine.map((k) => q.distractors?.[k]).filter(Boolean);
            return (
              <details key={q.id} className="card card-pad">
                <summary className="cursor-pointer"><span className="chip mr-2">{q.topic}</span><MdInline>{q.prompt.split('\n')[0].slice(0, 140)}</MdInline></summary>
                <div className="grid gap-3 mt-3">
                  <Md>{q.prompt}</Md>
                  <div className="text-sm grid gap-1">
                    <div><b>Your answer:</b> {mine.length ? mine.map((k) => <MdInline key={k}>{choices[k] ?? '?'}</MdInline>) : <i>none</i>}</div>
                    <div><b>Correct:</b> {ans.map((k) => <span key={k} className="mr-2"><MdInline>{choices[k] ?? '?'}</MdInline></span>)}</div>
                  </div>
                  {why.length > 0 && <div className="callout callout-warning text-sm"><div className="callout-title">Why that's tempting</div>{why.map((w, k) => <Md key={k}>{w!}</Md>)}</div>}
                  <div><div className="eyebrow mb-1">Explanation</div><Md>{q.explanation}</Md></div>
                  {objectiveById(q.objective) && <Link className="text-sm underline" to={`/quiz?obj=${encodeURIComponent(q.objective)}&n=3`}>Practise “{objectiveById(q.objective)!.title}”</Link>}
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default function Mock() {
  const st = useProgress();
  const pool = QUESTIONS.filter(isExamQuestion);
  const [run, setRun] = useState<{ qs: Question[]; kind: (typeof KINDS)[number] } | null>(null);
  const [result, setResult] = useState<(MockResult & { responses: Record<string, Response> }) | null>(null);
  const recent = useMemo(() => new Set(st.mocks.slice(-2).flatMap((m) => m.qids)), [st.mocks.length]);

  const start = (kind: (typeof KINDS)[number]) => setRun({ qs: mockSet(QUESTIONS, Math.min(kind.n, pool.length), st.seen, recent), kind });
  const submit = (responses: Record<string, Response>) => {
    if (!run) return;
    const rows = run.qs.map((q) => ({ q, correct: scoreAnswer(q, responses[q.id]), response: responses[q.id] }));
    for (const { q, correct } of rows) st.record({ qid: q.id, objective: q.objective, correct, firstTry: true, hinted: false, delayed: true, difficulty: q.difficulty });
    const s = mockSummary(rows);
    const m: MockResult = { at: Date.now(), kind: run.kind.id, score: s.correct, total: s.total, byTopic: s.byTopic, missed: s.missed, qids: run.qs.map((q) => q.id) };
    st.addMock(m);
    const stars = Math.round(s.correct / 4);
    if (stars) st.addStars(stars);
    if (s.percent >= 80) celebrate('huge'); else if (s.percent >= 70) celebrate('small');
    setResult({ ...m, responses });
    setRun(null);
    window.scrollTo({ top: 0 });
  };

  if (result) return <><PageHeader eyebrow="Mock exam · results" title="How it went" /><Results m={result} onClose={() => setResult(null)} /></>;
  if (run) return <Run qs={run.qs} minutes={run.kind.minutes * (run.qs.length / run.kind.n)} onSubmit={submit} />;
  if (!pool.length) return <><PageHeader eyebrow="Mock exam" title="Mock exams" /><Empty title="No exam questions yet">The question bank is being prepared.</Empty></>;
  const ready = readiness(st.mocks.map((x) => (100 * x.score) / Math.max(1, x.total)), st.mocks.map((x) => x.qids));
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Mock exam" title="Mock exams">Timed and multiple choice only, like Quiz 1. No hints or feedback until you submit. Each new mock avoids the questions used in your last two.</PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        {KINDS.map((k) => (
          <button key={k.id} className="card card-pad grid gap-2 text-left hover:border-[var(--accent)] transition-colors" onClick={() => start(k)} disabled={pool.length < 5}>
            <b className="text-lg">{k.label}</b><span className="text-sm text-muted">{Math.min(k.n, pool.length) < k.n ? `${pool.length} questions (all available) · ${Math.round(k.minutes * pool.length / k.n)} minutes` : k.desc}</span>
            <span className="btn btn-primary btn-sm justify-self-start mt-1">Start<Icon name="arrow" size={14} /></span>
          </button>
        ))}
      </div>
      <section className="card card-pad grid gap-3">
        <div className="flex justify-between items-baseline"><h2 className="font-bold">History</h2><span className="text-sm">Readiness: <span className="chip">{ready.level}</span></span></div>
        {st.mocks.length === 0 ? <p className="text-sm text-muted">No mocks yet. The plan suggests a full mock at the end of Tuesday.</p> : (
          <ul className="grid gap-2">{[...st.mocks].reverse().map((m) => { const p = (100 * m.score) / Math.max(1, m.total); return (
            <li key={m.at} className="grid grid-cols-[1fr_auto] gap-1 text-sm"><span>{new Date(m.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {KINDS.find((k) => k.id === m.kind)?.label || m.kind}</span><b className="tabular-nums">{Math.round(p)}%</b><div className="col-span-2"><Bar value={p} /></div></li>); })}</ul>
        )}
      </section>
    </div>
  );
}
