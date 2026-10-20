// One practice question of any type, with a hint, feedback on the chosen distractor,
// and remediation after a miss (the misconception, a link to the prerequisite lesson,
// and another question on the same objective). Only the first submission counts
// towards mastery; retries are for learning.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Question } from '../content/types';
import { lessonForObjective, objectiveById } from '../data';
import { levelOf } from '../lib/mastery';
import { scoreAnswer, type Response } from '../lib/score';
import { choiceOrder, seededOrder } from '../lib/select';
import { useProgress } from '../store/progress';
import Viz from '../viz';
import { Icon } from './Icon';
import { Md, MdInline } from './Md';
import { celebrate, StarPop, toast } from './Reward';

export interface Outcome { correct: boolean; firstTry: boolean; hinted: boolean }

const firstSentence = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(t.replace(/\$[^$]*\$/g, (x) => x.replace(/[.!?]/g, '․')));
  return (m ? m[1] : t).replace(/․/g, '.');
};
const TYPE_HINT: Record<Question['type'], string> = {
  mc: 'Choose one answer.', tf: 'True or false?', multi: 'Select all that apply.', numeric: 'Type a number.', order: 'Put these in the correct order.', match: 'Match each item on the left.',
};

export function QuestionCard({ q, delayed = false, onNext, onAnother, onOutcome, nextLabel = 'Next question' }: {
  q: Question; delayed?: boolean; onNext?: () => void; onAnother?: (q: Question) => void; onOutcome?: (o: Outcome) => void; nextLabel?: string;
}) {
  const record = useProgress((s) => s.record);
  const addStars = useProgress((s) => s.addStars);
  const choices = q.type === 'tf' ? (q.choices?.length ? q.choices : ['True', 'False']) : q.choices || [];
  const displayOrder = choiceOrder(q);
  const orderStart = useMemo(() => (q.type === 'order' ? seededOrder(choices.length, q.id) : []), [q.id]);
  const pairs = useMemo(() => (q.type === 'match' ? choices.map((c) => { const [l, r] = c.split('|'); return { l: (l || '').trim(), r: (r || '').trim() }; }) : []), [q.id]);
  const rightOrder = useMemo(() => (q.type === 'match' ? seededOrder(pairs.length, q.id + ':r') : []), [q.id]);
  const initial = (): Response => (q.type === 'multi' ? [] : q.type === 'order' ? orderStart : q.type === 'match' ? pairs.map(() => -1) : q.type === 'numeric' ? '' : null);
  const [resp, setResp] = useState<Response>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [counted, setCounted] = useState<Outcome | null>(null);
  const [hinted, setHinted] = useState(false);
  const [stars, setStars] = useState(0);
  const [reveal, setReveal] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { setResp(initial()); setSubmitted(false); setCorrect(false); setCounted(null); setHinted(false); setStars(0); setReveal(false); }, [q.id]);

  const ready = resp != null && (Array.isArray(resp) ? (q.type === 'match' ? resp.every((x) => x >= 0) : q.type === 'multi' ? resp.length > 0 : true) : resp !== '');

  function submit() {
    if (!ready || submitted) return;
    const ok = scoreAnswer(q, resp);
    setSubmitted(true); setCorrect(ok);
    if (!counted) {
      const o: Outcome = { correct: ok, firstTry: true, hinted };
      setCounted(o);
      const r = record({ qid: q.id, objective: q.objective, correct: ok, firstTry: true, hinted, delayed, difficulty: q.difficulty });
      onOutcome?.(o);
      if (ok) {
        const n = hinted ? 1 : 2;
        addStars(n); setStars(n);
        const before = levelOf(r.before), after = levelOf(r.after);
        if (after !== before && r.after > r.before) {
          toast({ tone: 'level', title: `Level up: ${after}`, body: objectiveById(q.objective)?.title });
          celebrate('small');
        }
      }
    }
  }
  const retry = () => { setResp(initial()); setSubmitted(false); };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (/SELECT|TEXTAREA/.test(target.tagName)) return;
    if (target.tagName === 'INPUT' && e.key !== 'Enter') return;
    // Let focused action buttons keep their native Enter behavior (Hint, retry,
    // answer reveal, reordering). Choice buttons can still use Enter to check.
    if (e.key === 'Enter' && target.closest('button') && !target.closest('button.choice')) return;
    if (e.key === 'Enter' && !submitted && ready) { e.preventDefault(); submit(); return; }
    if (e.key === 'Enter' && submitted && onNext) { e.preventDefault(); onNext(); return; }
    const n = parseInt(e.key, 10);
    if (!submitted && n >= 1 && n <= choices.length && (q.type === 'mc' || q.type === 'tf')) setResp(displayOrder[n - 1]);
    if (!submitted && n >= 1 && n <= choices.length && q.type === 'multi') toggle(displayOrder[n - 1]);
  };
  const toggle = (i: number) => setResp((r) => { const a = Array.isArray(r) ? r : []; return a.includes(i) ? a.filter((x) => x !== i) : [...a, i]; });
  const move = (i: number, d: number) => setResp((r) => { const a = [...(r as number[])]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  const chosen = typeof resp === 'number' ? resp : null;
  const distractor = submitted && !correct && chosen != null ? q.distractors?.[chosen] : undefined;
  const multiWrong = submitted && !correct && q.type === 'multi' && Array.isArray(resp) ? resp.filter((i) => !(q.answer as number[]).includes(i)).map((i) => q.distractors?.[i]).filter(Boolean) as string[] : [];
  const prereqLessons = [...new Set([...q.prereqs, q.objective])].map((o) => ({ o, l: lessonForObjective(o) })).filter((x) => x.l);
  const isAnswer = (i: number) => (Array.isArray(q.answer) ? q.answer.includes(i) : q.answer === i);

  const choiceClass = (i: number) => {
    const sel = Array.isArray(resp) ? resp.includes(i) : resp === i;
    if (!submitted) return sel ? ' selected' : '';
    if ((correct || reveal) && isAnswer(i)) return ' correct';
    if (sel && !isAnswer(i)) return ' wrong';
    if (sel && isAnswer(i)) return correct ? ' correct' : ' selected';
    return '';
  };

  return (
    <div ref={root} className="card card-pad grid gap-4 relative" tabIndex={-1} onKeyDown={onKey} data-qid={q.id}>
      <StarPop n={stars} show={stars > 0} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="chip">{q.topic}</span>
        <span className="text-muted">{TYPE_HINT[q.type]}</span>
        <span className="ml-auto text-muted" title="Difficulty">{'●'.repeat(q.difficulty)}{'○'.repeat(3 - q.difficulty)}</span>
      </div>
      <Md className="text-[1.05rem]">{q.prompt}</Md>
      {q.figure && <Viz id={q.figure.viz} preset={q.figure.preset} />}

      {(q.type === 'mc' || q.type === 'tf' || q.type === 'multi') && (
        <div className="grid gap-2" role={q.type === 'multi' ? 'group' : 'radiogroup'}>
          {displayOrder.map((i, position) => (
            <button key={i} className={`choice${choiceClass(i)}`} disabled={submitted} role={q.type === 'multi' ? 'checkbox' : 'radio'}
              aria-checked={Array.isArray(resp) ? resp.includes(i) : resp === i} onClick={() => (q.type === 'multi' ? toggle(i) : setResp(i))}>
              <span className="key">{q.type === 'multi' ? (Array.isArray(resp) && resp.includes(i) ? '✓' : '') : position + 1}</span><MdInline>{choices[i]}</MdInline>
            </button>
          ))}
        </div>
      )}
      {q.type === 'numeric' && (
        <label className="field max-w-xs">
          <span>Your answer</span>
          <input className="input" inputMode="decimal" value={typeof resp === 'string' ? resp : resp == null ? '' : String(resp)} disabled={submitted} onChange={(e) => setResp(e.target.value)} placeholder="e.g. 0.05" aria-label="Your numeric answer" />
        </label>
      )}
      {q.type === 'order' && Array.isArray(resp) && (
        <ol className="grid gap-2">
          {resp.map((ci, pos) => (
            <motion.li layout key={ci} className={`choice${submitted ? (ci === pos ? ' correct' : ' wrong') : ''}`}>
              <span className="key">{pos + 1}</span><span className="flex-1"><MdInline>{choices[ci]}</MdInline></span>
              {!submitted && <span className="flex gap-1">
                <button className="btn btn-sm btn-ghost" aria-label="Move up" disabled={pos === 0} onClick={() => move(pos, -1)}><Icon name="up" size={14} /></button>
                <button className="btn btn-sm btn-ghost" aria-label="Move down" disabled={pos === resp.length - 1} onClick={() => move(pos, 1)}><Icon name="down" size={14} /></button>
              </span>}
            </motion.li>
          ))}
        </ol>
      )}
      {q.type === 'match' && Array.isArray(resp) && (
        <div className="grid gap-2">
          {pairs.map((p, i) => {
            const ok = submitted && resp[i] === (q.answer as number[])[i];
            return (
              <div key={i} className={`choice items-center${submitted ? (ok ? ' correct' : ' wrong') : ''}`}>
                <span className="flex-1"><MdInline>{p.l}</MdInline></span>
                <select className="input max-w-[55%]" disabled={submitted} value={resp[i]} aria-label={`Match for ${p.l}`}
                  onChange={(e) => { const v = +e.target.value; setResp((r) => (r as number[]).map((x, j) => (j === i ? v : x))); }}>
                  <option value={-1}>Choose…</option>
                  {rightOrder.map((ri) => <option key={ri} value={ri}>{pairs[ri].r.replace(/\$/g, '')}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {!submitted && (
        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn btn-primary" disabled={!ready} onClick={submit}>Check answer</button>
          {!hinted && !counted && <button className="btn btn-ghost" onClick={() => setHinted(true)}><Icon name="bulb" size={16} />Hint</button>}
          <span className="text-xs text-muted hidden md:inline">{q.type === 'mc' || q.type === 'tf' ? 'Keys 1–' + choices.length + ' choose · ' : ''}Enter checks</span>
        </div>
      )}
      <AnimatePresence>
        {hinted && !submitted && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0 }} className="callout callout-tip">
            <div className="callout-title">Hint</div><Md>{firstSentence(q.explanation)}</Md>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {submitted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 grid gap-3 ${correct ? 'feedback-good' : 'feedback-bad'}`} aria-live="polite">
            <div className="flex items-center gap-2 font-bold">
              <Icon name={correct ? 'check' : 'x'} />
              {correct ? (counted?.correct ? (hinted ? 'Correct (with a hint).' : 'Correct on the first try.') : 'Correct now. Your first answer is what counts for mastery.') : 'Not quite.'}
            </div>
            {distractor && <div className="text-sm"><b>Why that's tempting:</b> <MdInline>{distractor}</MdInline></div>}
            {multiWrong.map((d, i) => <div key={i} className="text-sm"><MdInline>{d}</MdInline></div>)}
            {(correct || reveal) && <div><div className="eyebrow mb-1">Explanation</div><Md>{q.explanation}</Md></div>}
            {!correct && (
              <div className="grid gap-2 text-sm">
                {!!q.misconceptions?.length && <div><b>Common misconception:</b> {q.misconceptions.join(' ')}</div>}
                {prereqLessons.length > 0 && <div className="flex flex-wrap gap-2 items-center"><b>Review:</b>{prereqLessons.map(({ o, l }) => <Link key={o} className="chip chip-accent" to={`/learn/${l!.id}`}>{l!.title}</Link>)}</div>}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!correct && !reveal && <button className="btn" onClick={retry}><Icon name="reset" size={16} />Try again</button>}
              {!correct && !reveal && <button className="btn" onClick={() => setReveal(true)}>Show the answer</button>}
              {!correct && onAnother && <button className="btn" onClick={() => onAnother(q)}><Icon name="target" size={16} />Another question on this</button>}
              {onNext && <button className="btn btn-primary" onClick={onNext} autoFocus>{nextLabel}<Icon name="arrow" size={16} /></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
