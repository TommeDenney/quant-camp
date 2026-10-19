import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/content/types';
import { mockSummary, parseNumber, readiness, scoreAnswer } from '../../src/lib/score';

const base: Omit<Question, 'type' | 'answer'> = {
  id: 'x', module: 3, topic: 'p-values', subtopic: 's', objective: 'o', difficulty: 2, prompt: 'p', explanation: 'e',
  source: [{ file: 'L03-04', pages: [19] }], prereqs: [],
};
const q = (o: Partial<Question>): Question => ({ ...base, type: 'mc', answer: 0, choices: ['a', 'b', 'c'], ...o } as Question);

describe('scoreAnswer', () => {
  it('mc / tf', () => {
    expect(scoreAnswer(q({ answer: 2 }), 2)).toBe(true);
    expect(scoreAnswer(q({ answer: 2 }), 1)).toBe(false);
    expect(scoreAnswer(q({ type: 'tf', choices: ['True', 'False'], answer: 1 }), 1)).toBe(true);
    expect(scoreAnswer(q({ answer: 0 }), null)).toBe(false);
  });
  it('multi needs the exact set, in any order', () => {
    const m = q({ type: 'multi', choices: ['a', 'b', 'c', 'd'], answer: [0, 2] });
    expect(scoreAnswer(m, [2, 0])).toBe(true);
    expect(scoreAnswer(m, [0])).toBe(false);
    expect(scoreAnswer(m, [0, 2, 3])).toBe(false);
  });
  it('numeric with tolerance and text input', () => {
    const n = q({ type: 'numeric', answer: 0.0228, tolerance: 0.0005, choices: undefined });
    expect(scoreAnswer(n, 0.023)).toBe(true);
    expect(scoreAnswer(n, '0.0228')).toBe(true);
    expect(scoreAnswer(n, '0.03')).toBe(false);
    expect(scoreAnswer(q({ type: 'numeric', answer: -1.85, choices: undefined }), '−1.85')).toBe(true);
    expect(scoreAnswer(q({ type: 'numeric', answer: 100, choices: undefined }), '100.5')).toBe(true); // default 1%
    expect(scoreAnswer(q({ type: 'numeric', answer: 100, choices: undefined }), '102')).toBe(false);
    expect(scoreAnswer(q({ type: 'numeric', answer: 100, choices: undefined }), 'abc')).toBe(false);
  });
  it('order and match', () => {
    const o = q({ type: 'order', choices: ['1', '2', '3', '4'], answer: [0, 1, 2, 3] });
    expect(scoreAnswer(o, [0, 1, 2, 3])).toBe(true);
    expect(scoreAnswer(o, [1, 0, 2, 3])).toBe(false);
    const m = q({ type: 'match', choices: ['a|x', 'b|y', 'c|z'], answer: [2, 0, 1] });
    expect(scoreAnswer(m, [2, 0, 1])).toBe(true);
    expect(scoreAnswer(m, [0, 1, 2])).toBe(false);
  });
  it('parseNumber', () => {
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber(' 3 ')).toBe(3);
    expect(parseNumber('')).toBe(null);
  });
});

describe('mockSummary and readiness', () => {
  it('summarises by topic and module', () => {
    const rows = [
      { q: q({ id: 'a', topic: 'tests', module: 4 }), correct: true },
      { q: q({ id: 'b', topic: 'tests', module: 4 }), correct: false },
      { q: q({ id: 'c', topic: 'acf', module: 6 }), correct: true },
      { q: q({ id: 'd', topic: 'acf', module: 6 }), correct: true },
    ];
    const s = mockSummary(rows);
    expect(s.percent).toBe(75);
    expect(s.byTopic.tests).toEqual([1, 2]);
    expect(s.byModule[6]).toEqual([2, 2]);
    expect(s.missed).toEqual(['b']);
    expect(s.weakTopics).toEqual(['tests']);
  });
  it('readiness needs two distinct passes', () => {
    expect(readiness([]).level).toBe('no data');
    expect(readiness([85]).level).toBe('close');
    expect(readiness([82, 86]).level).toBe('ready');
    expect(readiness([50, 60]).level).toBe('not yet');
  });
});
