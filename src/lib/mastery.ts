// Mastery and spaced review. A transparent heuristic (not a validated memory model):
// mastery rises most when you answer NEW application questions correctly on the
// first try without hints, and decays slowly when a concept hasn't been recalled.

export interface Attempt {
  qid: string;
  objective: string;
  correct: boolean;
  firstTry: boolean;
  hinted: boolean;
  /** Seen this question before? (repeats count less) */
  repeat: boolean;
  /** Was this a delayed review (vs. right after the lesson)? */
  delayed: boolean;
  difficulty: 1 | 2 | 3;
  at: number; // ms
}

export interface ObjectiveState {
  score: number; // 0–100
  attempts: number;
  correct: number;
  lastCorrectAt: number | null;
  lastSeenAt: number | null;
  /** Next scheduled review (ms), or null if none yet. */
  dueAt: number | null;
  /** Position in the review ladder (0 = later this session … 3 = before the exam). */
  step: number;
  missedRecently: boolean;
}

export const emptyState = (): ObjectiveState => ({ score: 0, attempts: 0, correct: 0, lastCorrectAt: null, lastSeenAt: null, dueAt: null, step: 0, missedRecently: false });

export const LEVELS = [
  { min: 90, label: 'Strong' },
  { min: 80, label: 'Proficient' },
  { min: 60, label: 'Practicing' },
  { min: 40, label: 'Developing' },
  { min: 0, label: 'Needs foundation' },
] as const;
export const levelOf = (score: number) => LEVELS.find((l) => score >= l.min)!.label;

/** How many points one attempt is worth (before the room-to-grow scaling). */
export function gain(a: Attempt) {
  if (!a.correct) return -(a.difficulty === 1 ? 14 : 10); // missing an easy one says more
  let g = 8 + a.difficulty * 6; // 14 / 20 / 26
  if (!a.firstTry) g *= 0.35;
  if (a.hinted) g *= 0.5;
  if (a.repeat) g *= 0.4; // a repeated question tests memory of the item, not the idea
  if (a.delayed) g *= 1.3; // delayed recall is the strongest evidence
  return g;
}

/** Review ladder in hours: later this session, a few hours, next day, before the exam. */
export const DEFAULT_LADDER = [0.4, 4, 20, 40];

/**
 * Scale the ladder to the time left before the exam, so every concept gets its
 * reviews before the exam even when there are only a few hours left.
 */
export function ladderFor(hoursLeft: number) {
  const total = DEFAULT_LADDER.reduce((a, b) => a + b, 0);
  const k = Math.min(1, Math.max(0.05, (hoursLeft * 0.8) / total));
  return DEFAULT_LADDER.map((h) => h * k);
}

/** Apply one attempt to an objective's state. Pure: returns a new state. */
export function applyAttempt(s: ObjectiveState, a: Attempt, hoursLeft = 48): ObjectiveState {
  const n: ObjectiveState = { ...s, attempts: s.attempts + 1, lastSeenAt: a.at };
  const g = gain(a);
  // Room to grow: gains shrink near 100, losses shrink near 0.
  n.score = Math.max(0, Math.min(100, s.score + (g > 0 ? g * (1 - s.score / 115) : g * (0.4 + s.score / 160))));
  const ladder = ladderFor(hoursLeft);
  if (a.correct) {
    n.correct = s.correct + 1;
    n.lastCorrectAt = a.at;
    n.missedRecently = false;
    // A correct first-try answer climbs the review ladder; otherwise stay on this rung.
    n.step = a.firstTry && !a.hinted ? Math.min(ladder.length - 1, s.step + (s.dueAt == null ? 0 : 1)) : s.step;
    n.dueAt = a.at + ladder[n.step] * 3600e3;
  } else {
    n.missedRecently = true;
    n.step = 0;
    n.dueAt = a.at + 10 * 60e3; // try a different question on this idea in ~10 minutes
  }
  return n;
}

/** Score after forgetting: a slow decay with time since the last correct recall. */
export function currentScore(s: ObjectiveState, now = Date.now()) {
  if (s.lastCorrectAt == null) return s.score;
  const days = (now - s.lastCorrectAt) / 864e5;
  return Math.max(0, s.score - Math.max(0, days - 0.5) * 6);
}

export const isDue = (s: ObjectiveState, now = Date.now()) => s.dueAt != null && s.dueAt <= now;
