// Pure scoring for every question type, plus the mock-exam summary.
// Responses:
//   mc / tf   → the chosen choice index
//   multi     → the chosen choice indexes (order doesn't matter)
//   numeric   → a number, or the text typed (commas/spaces/unicode minus allowed)
//   order     → the original choice indexes in the order the student placed them
//               (choices are stored in the correct order, so correct = [0, 1, 2, …])
//   match     → for each left item, the index of the right item chosen
import type { Question } from '../content/types';

export type Response = number | number[] | string | null | undefined;

export function parseNumber(r: Response): number | null {
  if (typeof r === 'number') return Number.isFinite(r) ? r : null;
  if (typeof r !== 'string') return null;
  const t = r.trim().replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  if (!t) return null;
  const pct = t.endsWith('%');
  const v = Number(pct ? t.slice(0, -1) : t);
  if (!Number.isFinite(v)) return null;
  return v;
}

/** Default tolerance for numeric answers: 1% of the answer (at least 1e-9). */
export const defaultTolerance = (answer: number) => Math.max(1e-9, Math.abs(answer) * 0.01);

export function scoreAnswer(q: Question, r: Response): boolean {
  if (r == null) return false;
  switch (q.type) {
    case 'mc':
    case 'tf':
      return typeof r === 'number' && r === q.answer;
    case 'multi': {
      if (!Array.isArray(r) || !Array.isArray(q.answer)) return false;
      const a = new Set(q.answer), b = new Set(r);
      return a.size === b.size && [...a].every((x) => b.has(x));
    }
    case 'numeric': {
      const v = parseNumber(r);
      if (v == null || typeof q.answer !== 'number') return false;
      const tol = q.tolerance ?? defaultTolerance(q.answer);
      return Math.abs(v - q.answer) <= tol + 1e-12;
    }
    case 'order':
      return Array.isArray(r) && r.length === (q.choices?.length ?? -1) && r.every((x, i) => x === i);
    case 'match':
      return Array.isArray(r) && Array.isArray(q.answer) && r.length === q.answer.length && r.every((x, i) => x === (q.answer as number[])[i]);
    default:
      return false;
  }
}

export interface ResultRow { q: Question; correct: boolean; response?: Response }
export interface MockSummary {
  correct: number;
  total: number;
  percent: number;
  byTopic: Record<string, [number, number]>; // topic → [correct, total]
  byModule: Record<number, [number, number]>;
  missed: string[]; // question ids
  weakTopics: string[]; // topics under 80%, weakest first
}

export function mockSummary(rows: ResultRow[]): MockSummary {
  const byTopic: Record<string, [number, number]> = {};
  const byModule: Record<number, [number, number]> = {};
  let correct = 0;
  for (const { q, correct: ok } of rows) {
    (byTopic[q.topic] ||= [0, 0])[1]++;
    (byModule[q.module] ||= [0, 0])[1]++;
    if (ok) { correct++; byTopic[q.topic][0]++; byModule[q.module][0]++; }
  }
  const total = rows.length;
  const weakTopics = Object.entries(byTopic).filter(([, [c, t]]) => c / t < 0.8).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([k]) => k);
  return { correct, total, percent: total ? Math.round((correct / total) * 1000) / 10 : 0, byTopic, byModule, missed: rows.filter((r) => !r.correct).map((r) => r.q.id), weakTopics };
}

/** Readiness from repeated mock results: needs two distinct cumulative assessments ≥ 80%. */
export function readiness(percents: number[], questionSets?: string[][]) {
  const passes = percents.filter((p) => p >= 80).length;
  const recent = percents.slice(-3);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const consecutivePasses = percents.length >= 2 && percents.slice(-2).every((p) => p >= 80);
  const latestSets = questionSets?.slice(-2);
  const distinct = !questionSets || (latestSets?.length === 2 && latestSets.every((s) => s.length > 0)
    && JSON.stringify([...latestSets[0]].sort()) !== JSON.stringify([...latestSets[1]].sort()));
  const level = consecutivePasses && distinct ? 'ready' : avg >= 70 ? 'close' : percents.length ? 'not yet' : 'no data';
  return { passes, recentAverage: Math.round(avg), level };
}
