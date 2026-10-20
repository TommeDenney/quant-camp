import { describe, expect, it } from 'vitest';
import type { Question } from '../../src/content/types';
import { choiceOrder, mockSet, pick, recentlyMissed } from '../../src/lib/select';
import { scoreAnswer } from '../../src/lib/score';

const q = (id: string, over: Partial<Question> = {}): Question => ({
  id, module: 0, topic: 'test', subtopic: '', objective: 'a', difficulty: 1,
  prompt: 'Choose', type: 'mc', choices: ['correct', 'wrong', 'other'], answer: 0,
  explanation: 'Because', source: [], prereqs: [], ...over,
});

describe('session selection', () => {
  it('prefers unseen questions within each objective without duplicates', () => {
    const pool = [q('seen'), q('fresh'), q('other', { objective: 'b' })];
    const result = pick(pool, 20, { seen: 3 });
    expect(result.indexOf(pool[1])).toBeLessThan(result.indexOf(pool[0]));
    expect(new Set(result.map((x) => x.id)).size).toBe(3);
    expect(pick(pool, 2, {}, new Set(['seen'])).map((x) => x.id)).not.toContain('seen');
  });
  it('keeps mocks exam-style and avoids recent questions when enough remain', () => {
    const pool = [q('a'), q('b'), q('c'), q('number', { type: 'numeric' }), q('excluded', { exam: false })];
    expect(mockSet(pool, 2, {}, new Set(['a'])).map((x) => x.id).sort()).toEqual(['b', 'c']);
    expect(new Set(mockSet(pool, 3, {}, new Set(['a'])).map((x) => x.id)).size).toBe(3);
  });
  it('a later correct attempt clears a previous miss', () => {
    const attempts = [
      { qid: 'a', at: 100, correct: false }, { qid: 'b', at: 101, correct: false },
      { qid: 'a', at: 102, correct: true },
    ];
    expect(recentlyMissed(attempts as Parameters<typeof recentlyMissed>[0], 72, 103)).toEqual(['b']);
  });
});

describe('answer display order', () => {
  it('provides default True/False choices in their semantic order', () => {
    expect(choiceOrder(q('tf', { type: 'tf', choices: undefined }))).toEqual([0, 1]);
  });
  it('keeps scoring attached to the stored index after shuffling', () => {
    const question = q('shuffled');
    const order = choiceOrder(question);
    expect([...order].sort()).toEqual([0, 1, 2]);
    expect(order).not.toEqual([0, 1, 2]);
    expect(choiceOrder(question)).toEqual(order);
    expect(scoreAnswer(question, order[order.indexOf(0)])).toBe(true);
  });
  it('pins all/none of the above after the movable choices', () => {
    const order = choiceOrder(q('pinned', { choices: ['a', 'b', 'All of the above'] }));
    expect(order[2]).toBe(2);
  });
});
