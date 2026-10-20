// What to study next, and the two-day boot-camp schedule. Priorities come from:
// exam relevance (the Quiz 1 review), current mastery, prerequisites, difficulty
// and the time left before the exam.
import type { Lesson, Module, Objective } from '../content/types';
import { currentScore, emptyState, isDue, type ObjectiveState } from './mastery';

export type Task =
  | { kind: 'review'; objective: string; reason: string }
  | { kind: 'lesson'; lesson: string; reason: string }
  | { kind: 'practice'; objective: string; reason: string }
  | { kind: 'mock'; reason: string };

export interface PlanInput {
  modules: Module[];
  lessons: Lesson[];
  objectives: Objective[];
  states: Record<string, ObjectiveState>;
  lessonsDone: Record<string, { done: boolean }>;
  now: number;
  examAt: number;
  mockCount: number;
}

const stateOf = (states: Record<string, ObjectiveState>, id: string) => states[id] || emptyState();

/** An objective is ready to learn when its prerequisites are at least "Practicing" (60) or already taught. */
export function prereqsMet(o: Objective, states: Record<string, ObjectiveState>, taught: Set<string>, now: number) {
  return o.prereqs.every((p) => taught.has(p) || currentScore(stateOf(states, p), now) >= 60);
}

/** Urgency of practising an objective now: weak + important + exam soon = high. */
export function urgency(o: Objective, s: ObjectiveState, hoursLeft: number, now: number) {
  const weakness = 100 - currentScore(s, now);
  const importance = o.priority === 1 ? 1.5 : o.priority === 2 ? 1.1 : 0.8;
  const pressure = hoursLeft < 12 ? 1.3 : 1;
  return weakness * importance * pressure + (s.missedRecently ? 25 : 0);
}

/** The single best next thing to do, plus a short queue after it. */
export function nextTasks(p: PlanInput, n = 5): Task[] {
  const hoursLeft = Math.max(0, (p.examAt - p.now) / 3600e3);
  const tasks: Task[] = [];
  const taught = new Set(p.lessons.filter((l) => p.lessonsDone[l.id]?.done).flatMap((l) => l.objectives));
  // 1. Reviews that are due (missed questions first).
  const due = p.objectives
    .map((o) => ({ o, s: stateOf(p.states, o.id) }))
    .filter(({ s }) => isDue(s, p.now))
    .sort((a, b) => Number(b.s.missedRecently) - Number(a.s.missedRecently) || urgency(b.o, b.s, hoursLeft, p.now) - urgency(a.o, a.s, hoursLeft, p.now));
  for (const { o, s } of due.slice(0, 2)) tasks.push({ kind: 'review', objective: o.id, reason: s.missedRecently ? 'You missed this recently: try a fresh question.' : 'Due for spaced review.' });
  // 2. The next lesson in study order whose prerequisites are in place.
  const order = p.modules.flatMap((m) => m.lessons);
  const sprint = isSprint(hoursLeft);
  // In sprint mode: test out of the basics first, then core lessons, then the skim modules.
  const rank = (l: Lesson) => (sprint ? ({ testout: 0, core: 1, skim: 2, final: 3 } as const)[tierOf(l.module)] : 0);
  const next = order.map((id) => p.lessons.find((l) => l.id === id)!).filter(Boolean).sort((a, b) => rank(a) - rank(b)).find((l) => !p.lessonsDone[l.id]?.done
    && l.objectives.every((oid) => { const o = p.objectives.find((x) => x.id === oid); return !o || prereqsMet(o, p.states, new Set([...taught, ...l.objectives]), p.now); }));
  if (next) tasks.push({ kind: 'lesson', lesson: next.id, reason: sprint ? `${TIER_LABEL[tierOf(next.module)]}: ${TIER_HINT[tierOf(next.module)]}` : hoursLeft < 14 ? 'Next lesson (keep it brisk: the exam is close).' : 'Next lesson in your plan.' });
  // 3. Practise the weakest taught objectives.
  const weak = p.objectives.filter((o) => taught.has(o.id))
    .map((o) => ({ o, u: urgency(o, stateOf(p.states, o.id), hoursLeft, p.now), sc: currentScore(stateOf(p.states, o.id), p.now) }))
    .filter((x) => x.sc < 80).sort((a, b) => b.u - a.u);
  for (const { o } of weak.slice(0, 2)) tasks.push({ kind: 'practice', objective: o.id, reason: 'One of your weakest topics.' });
  // 4. A mock exam once most of the course is taught.
  const evening = new Date(p.now).getHours() >= 19 && hoursLeft > 12;
  if ((taught.size >= p.objectives.length * 0.7 || (sprint && p.mockCount === 0 && (evening || taught.size >= p.objectives.length * 0.5))) && p.mockCount < 3) tasks.push({ kind: 'mock', reason: 'Most topics are covered: check your readiness under exam conditions.' });
  if (sprint && evening && p.mockCount === 0) { const i = tasks.findIndex((t) => t.kind === 'mock'); if (i > 0) tasks.unshift(...tasks.splice(i, 1).map((t) => ({ ...t, reason: 'Tonight: one timed mock, review what you missed, then sleep.' }))); }
  return tasks.slice(0, n);
}

/** Split the lessons over Monday, Tuesday and Wednesday to fit the hours available. */
export function bootCampSchedule(modules: Module[], lessons: Lesson[], hours: { mon: number; tue: number; wedMin: number }) {
  const minutesOf = (m: Module) => m.lessons.reduce((a, id) => a + (lessons.find((l) => l.id === id)?.minutes || 8), 0);
  const days = { mon: modules.filter((m) => m.day === 'mon'), tue: modules.filter((m) => m.day === 'tue'), wed: modules.filter((m) => m.day === 'wed') };
  const plan = (mods: Module[], budget: number, assessment: string) => {
    const need = mods.reduce((a, m) => a + minutesOf(m), 0) + 30; // + the closing assessment
    const scale = Math.min(1, budget / Math.max(1, need));
    return { modules: mods.map((m) => ({ id: m.id, title: m.title, minutes: Math.round(minutesOf(m) * scale) })), assessment, need, budget, compressed: scale < 1 };
  };
  return {
    mon: plan(days.mon, hours.mon * 60, '20-question mixed assessment'),
    tue: plan(days.tue, hours.tue * 60, 'Full 40-question mock exam'),
    wed: { focus: ['Your weakest concepts', 'Formula review', 'Which-test review', 'p-values and confidence intervals', 'Short mixed checks', 'The open-note reference'], minutes: hours.wedMin },
  };
}

/* ---------- Sprint mode: under 30 hours to the exam ---------- */

/** How to treat each module when time is short: learn fully, skim the essential steps, or test out. */
export type Tier = 'core' | 'skim' | 'testout' | 'final';
const TIERS: Record<number, Tier> = { 0: 'testout', 1: 'testout', 2: 'testout', 3: 'core', 4: 'core', 5: 'skim', 6: 'core', 7: 'core', 8: 'skim', 9: 'skim', 10: 'core', 11: 'skim', 12: 'skim', 13: 'final' };
export const tierOf = (module: number): Tier => TIERS[module] ?? 'core';
export const TIER_LABEL: Record<Tier, string> = { core: 'Core', skim: 'Skim', testout: 'Test out', final: 'Final' };
export const TIER_HINT: Record<Tier, string> = {
  core: 'On the review list: do every step.',
  skim: 'Do the starred steps (Why, Plain, Example, Check, Takeaway); skim the rest.',
  testout: 'Press "I know this: test me" first; only study it if you miss questions.',
  final: 'Mixed practice for exam morning.',
};
/** The lesson steps to do in a skim lesson. */
export const SKIM_STEPS = ['why', 'plain', 'worked', 'check', 'takeaway'];
export const SPRINT_HOURS = 30;
export const isSprint = (hoursLeft: number) => hoursLeft > 0 && hoursLeft < SPRINT_HOURS;

export interface SprintBlock { id: string; when: 'today' | 'tonight' | 'morning'; title: string; detail: string; minutes: number; to: string; done: number; total: number }

/** The fixed sprint plan, with live progress for each block. */
export function sprintPlan(modules: Module[], lessonsDone: Record<string, { done: boolean }>, mockCount: number, pythonDone: number, pythonTotal: number): SprintBlock[] {
  const of = (t: Tier) => modules.filter((m) => tierOf(m.id) === t).flatMap((m) => m.lessons);
  const count = (ids: string[]) => ids.filter((id) => lessonsDone[id]?.done).length;
  const first = (ids: string[]) => ids.find((id) => !lessonsDone[id]?.done) || ids[0];
  const block = (id: string, when: SprintBlock['when'], title: string, detail: string, minutes: number, ids: string[]): SprintBlock =>
    ({ id, when, title, detail, minutes, to: ids.length ? `/learn/${first(ids)}` : '/learn', done: count(ids), total: ids.length });
  const testout = of('testout'), core = of('core'), skim = of('skim'), fin = of('final');
  return [
    { id: 'index', when: 'today', title: 'Start your notes index', detail: 'Open-note exam: the skill is knowing where to look. Keep one notebook page as you study: topic, lecture, slide, reference section.', minutes: 10, to: '/reference', done: 0, total: 0 },
    block('testout', 'today', 'Test out of the basics', 'Modules 0 to 2. Press "I know this: test me" on each lesson and only study the ones you miss.', 45, testout),
    block('core', 'today', 'Core lessons, every step', 'Hypothesis testing, choosing a test, time-series basics, AR(1) and regression. Copy key formulas into your notebook.', 240, core),
    { id: 'findit', when: 'today', title: 'Find-it drill', detail: 'For each exam problem, pick the lecture and reference section you would open. Aim for under 20 seconds each.', minutes: 20, to: '/findit', done: 0, total: 0 },
    { id: 'python', when: 'today', title: 'Python Lab and Colab guide', detail: 'Work through the Colab steps, then run the examples. Download the notebook so you have it in Colab.', minutes: 75, to: '/python', done: pythonDone, total: pythonTotal },
    block('skim', 'today', 'Skim the rest', 'Permutation and bootstrap, filtering, spectral, model selection and attribution: Why, Plain, Example, Check, Takeaway.', 120, skim),
    { id: 'mock', when: 'tonight', title: 'One timed mock exam', detail: 'Use your printed reference sheet and notes, as in the real exam. Then review only what you missed, and sleep.', minutes: 90, to: '/mock', done: Math.min(1, mockCount), total: 1 },
    { id: 'findit2', when: 'morning', title: 'Find-it drill, one more round', detail: 'Warm up the habit: read the problem, name the tool, open the right page.', minutes: 10, to: '/findit', done: 0, total: 0 },
    { id: 'weak', when: 'morning', title: 'Practise your weakest topics', detail: 'Short sets picked from your mastery scores.', minutes: 50, to: '/practice', done: 0, total: 0 },
    block('final', 'morning', 'Final integrated practice', 'Module 13: mixed scenarios that combine everything.', 45, fin),
    { id: 'reference', when: 'morning', title: 'Skim the reference sheet', detail: 'Print it or save a PDF, tab the pages you use most, and check your notes index. No new lessons in the last hour.', minutes: 25, to: '/reference', done: 0, total: 0 },
  ];
}
