// Derived numbers for the dashboard: mastery per objective and module, accuracy,
// reviews due, and where a task should take you.
import { LESSONS, MODULES, OBJECTIVES, objectiveById } from '../data';
import type { Task } from './plan';
import { currentScore, emptyState, isDue, type Attempt, type ObjectiveState } from './mastery';

export function masteryOf(states: Record<string, ObjectiveState>, ids: string[], now = Date.now()) {
  if (!ids.length) return 0;
  const w = (id: string) => { const p = objectiveById(id)?.priority ?? 2; return p === 1 ? 1.5 : p === 2 ? 1 : 0.6; };
  const tot = ids.reduce((a, id) => a + w(id), 0);
  return ids.reduce((a, id) => a + w(id) * currentScore(states[id] || emptyState(), now), 0) / tot;
}
export const objectivesOfModule = (m: number) => OBJECTIVES.filter((o) => o.module === m).map((o) => o.id);
export const moduleMastery = (states: Record<string, ObjectiveState>, now = Date.now()) =>
  MODULES.map((m) => ({ m, score: masteryOf(states, objectivesOfModule(m.id), now), n: objectivesOfModule(m.id).length }));

export function accuracy(attempts: Attempt[]) {
  const first = attempts.filter((a) => a.firstTry);
  return { n: attempts.length, correct: first.filter((a) => a.correct).length, pct: first.length ? (100 * first.filter((a) => a.correct).length) / first.length : 0 };
}
export const dueObjectives = (states: Record<string, ObjectiveState>, now = Date.now()) => OBJECTIVES.filter((o) => states[o.id] && isDue(states[o.id], now)).map((o) => o.id);

export function weakest(states: Record<string, ObjectiveState>, n = 5, now = Date.now()) {
  return OBJECTIVES.filter((o) => (states[o.id]?.attempts || 0) > 0)
    .map((o) => ({ o, score: currentScore(states[o.id], now) })).sort((a, b) => a.score - b.score).slice(0, n);
}

export function taskLink(t: Task) {
  switch (t.kind) {
    case 'lesson': return { to: `/learn/${t.lesson}`, label: LESSONS.find((l) => l.id === t.lesson)?.title || 'Next lesson', verb: 'Learn' };
    case 'review': return { to: `/quiz?obj=${encodeURIComponent(t.objective)}&n=3&delayed=1`, label: objectiveById(t.objective)?.title || t.objective, verb: 'Review' };
    case 'practice': return { to: `/quiz?obj=${encodeURIComponent(t.objective)}&n=5`, label: objectiveById(t.objective)?.title || t.objective, verb: 'Practise' };
    case 'mock': return { to: '/mock', label: '40-question mock exam', verb: 'Mock exam' };
  }
}
