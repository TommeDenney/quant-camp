// Choosing questions for a session: prefer questions not seen yet (or seen least),
// spread across objectives, and keep mock exams to exam-style multiple choice.
import type { Question } from '../content/types';
import type { Attempt } from './mastery';

export const EXAM_TYPES = new Set(['mc', 'tf', 'multi']);
export const isExamQuestion = (q: Question) => q.exam !== false && EXAM_TYPES.has(q.type);

function shuffled<T>(x: T[]) {
  const a = [...x];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Pick n questions, least-seen first (random among equals), round-robin across objectives. */
export function pick(pool: Question[], n: number, seen: Record<string, number>, exclude: Set<string> = new Set()) {
  const avail = shuffled(pool.filter((q) => !exclude.has(q.id))).sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));
  const byObj = new Map<string, Question[]>();
  for (const q of avail) byObj.set(q.objective, [...(byObj.get(q.objective) || []), q]);
  const queues = [...byObj.values()];
  const out: Question[] = [];
  while (out.length < n && queues.some((q) => q.length)) for (const q of queues) { const x = q.shift(); if (x && out.length < n) out.push(x); }
  return out;
}

/** A mock exam: n exam-style questions, spread over modules in proportion to the pool, avoiding recently used ones. */
export function mockSet(all: Question[], n: number, seen: Record<string, number>, recentMockIds: Set<string>) {
  const pool = all.filter(isExamQuestion);
  const fresh = pool.filter((q) => !recentMockIds.has(q.id));
  const base = fresh.length >= n ? fresh : pool;
  const byMod = new Map<number, Question[]>();
  for (const q of base) byMod.set(q.module, [...(byMod.get(q.module) || []), q]);
  const out: Question[] = [];
  for (const [, qs] of byMod) out.push(...pick(qs, Math.max(1, Math.round((qs.length / base.length) * n)), seen));
  const extra = pick(base, n, seen, new Set(out.map((q) => q.id)));
  return shuffled([...shuffled(out).slice(0, n), ...extra].slice(0, n));
}

/** Questions answered wrongly (on the first try) in the last `hours`, most recent first, excluding ones since answered correctly. */
export function recentlyMissed(attempts: Attempt[], hours = 72, now = Date.now()) {
  const since = now - hours * 3600e3;
  const last = new Map<string, Attempt>();
  for (const a of attempts) if (a.at >= since) last.set(a.qid, a);
  return [...last.values()].filter((a) => !a.correct).sort((a, b) => b.at - a.at).map((a) => a.qid);
}

/** A small deterministic shuffle (for order/match questions), seeded by the question id. */
export function seededOrder(n: number, seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  if (n > 1 && idx.every((v, i) => v === i)) idx.push(idx.shift()!); // never start already solved
  return idx;
}
