import { describe, expect, it } from 'vitest';
import { applyAttempt, currentScore, emptyState, gain, isDue, ladderFor, levelOf, type Attempt } from './mastery';

const base: Attempt = { qid: 'q1', objective: 'o', correct: true, firstTry: true, hinted: false, repeat: false, delayed: false, difficulty: 2, at: 0 };

describe('mastery', () => {
  it('reading alone gives nothing; new first-try application answers count most', () => {
    expect(emptyState().score).toBe(0);
    expect(gain(base)).toBeGreaterThan(gain({ ...base, firstTry: false }));
    expect(gain(base)).toBeGreaterThan(gain({ ...base, hinted: true }));
    expect(gain(base)).toBeGreaterThan(gain({ ...base, repeat: true }));
    expect(gain({ ...base, delayed: true })).toBeGreaterThan(gain(base));
    expect(gain({ ...base, difficulty: 3 })).toBeGreaterThan(gain({ ...base, difficulty: 1 }));
  });
  it('score stays in 0–100 and wrong answers lower it', () => {
    let s = emptyState();
    for (let i = 0; i < 40; i++) s = applyAttempt(s, { ...base, qid: `q${i}`, at: i });
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.score).toBeGreaterThan(85);
    const after = applyAttempt(s, { ...base, correct: false, at: 99 });
    expect(after.score).toBeLessThan(s.score);
    expect(applyAttempt(emptyState(), { ...base, correct: false }).score).toBe(0);
  });
  it('levels follow the published bands', () => {
    expect(levelOf(0)).toBe('Needs foundation');
    expect(levelOf(45)).toBe('Developing');
    expect(levelOf(65)).toBe('Practicing');
    expect(levelOf(85)).toBe('Proficient');
    expect(levelOf(95)).toBe('Strong');
  });
  it('schedules reviews: soon after a miss, further apart after successes', () => {
    const miss = applyAttempt(emptyState(), { ...base, correct: false, at: 0 }, 48);
    expect(miss.dueAt).toBe(10 * 60e3);
    let s = applyAttempt(emptyState(), { ...base, at: 0 }, 48);
    const first = s.dueAt!;
    s = applyAttempt(s, { ...base, qid: 'q2', at: first, delayed: true }, 48);
    expect(s.dueAt! - first).toBeGreaterThan(first);
    expect(isDue(s, s.dueAt!)).toBe(true);
  });
  it('compresses the ladder when the exam is close', () => {
    const full = ladderFor(200), short = ladderFor(6);
    expect(short[3]).toBeLessThan(full[3]);
    expect(short.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(6);
  });
  it('decays slowly without recall', () => {
    const s = { ...emptyState(), score: 80, lastCorrectAt: 0 };
    expect(currentScore(s, 0)).toBe(80);
    expect(currentScore(s, 2 * 864e5)).toBeLessThan(80);
    expect(currentScore(s, 2 * 864e5)).toBeGreaterThan(60);
  });
});
