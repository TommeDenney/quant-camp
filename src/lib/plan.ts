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
  const next = order.map((id) => p.lessons.find((l) => l.id === id)!).filter(Boolean).find((l) => !p.lessonsDone[l.id]?.done
    && l.objectives.every((oid) => { const o = p.objectives.find((x) => x.id === oid); return !o || prereqsMet(o, p.states, new Set([...taught, ...l.objectives]), p.now); }));
  if (next) tasks.push({ kind: 'lesson', lesson: next.id, reason: hoursLeft < 14 ? 'Next lesson (keep it brisk: the exam is close).' : 'Next lesson in your plan.' });
  // 3. Practise the weakest taught objectives.
  const weak = p.objectives.filter((o) => taught.has(o.id))
    .map((o) => ({ o, u: urgency(o, stateOf(p.states, o.id), hoursLeft, p.now), sc: currentScore(stateOf(p.states, o.id), p.now) }))
    .filter((x) => x.sc < 80).sort((a, b) => b.u - a.u);
  for (const { o } of weak.slice(0, 2)) tasks.push({ kind: 'practice', objective: o.id, reason: 'One of your weakest topics.' });
  // 4. A mock exam once most of the course is taught.
  if (taught.size >= p.objectives.length * 0.7 && p.mockCount < 3) tasks.push({ kind: 'mock', reason: 'Most topics are covered: check your readiness under exam conditions.' });
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
