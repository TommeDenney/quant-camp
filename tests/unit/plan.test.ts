import { describe, expect, it } from 'vitest';
import type { Lesson, Module, Objective } from '../../src/content/types';
import { emptyState } from '../../src/lib/mastery';
import { bootCampSchedule, nextTasks, urgency } from '../../src/lib/plan';

const NOW = 1_000_000_000;
const obj = (id: string, priority: 1 | 2 | 3 = 1, prereqs: string[] = []): Objective => ({ id, module: 0, title: id, prereqs, priority, sources: [{ file: 'review', pages: [4] }] });
const lesson = (id: string, module: number, objectives: string[], minutes = 10): Lesson => ({ id, module, title: id, minutes, objectives, sources: [], why: [], prereq: [], plain: [], visual: [], worked: [], interact: [], check: [], takeaway: '' });

const modules: Module[] = [
  { id: 0, title: 'A', day: 'mon', blurb: '', lessons: ['l1', 'l2'] },
  { id: 1, title: 'B', day: 'tue', blurb: '', lessons: ['l3'] },
  { id: 2, title: 'C', day: 'wed', blurb: '', lessons: [] },
];
const lessons = [lesson('l1', 0, ['a']), lesson('l2', 0, ['b']), lesson('l3', 1, ['c'])];
const objectives = [obj('a'), obj('b', 2, ['a']), obj('c', 3)];
const input = (over = {}) => ({ modules, lessons, objectives, states: {}, lessonsDone: {}, now: NOW, examAt: NOW + 30 * 3600e3, mockCount: 0, ...over });

describe('nextTasks', () => {
  it('starts with the first lesson for a new student', () => {
    const t = nextTasks(input());
    expect(t[0]).toMatchObject({ kind: 'lesson', lesson: 'l1' });
    expect(t.some((x) => x.kind === 'mock')).toBe(false);
  });
  it('puts due reviews first, missed ones before ordinary ones', () => {
    const states = {
      a: { ...emptyState(), score: 70, dueAt: NOW - 1 },
      b: { ...emptyState(), score: 40, dueAt: NOW - 1, missedRecently: true },
    };
    const t = nextTasks(input({ states, lessonsDone: { l1: { done: true } } }));
    expect(t[0]).toMatchObject({ kind: 'review', objective: 'b' });
    expect(t[1]).toMatchObject({ kind: 'review', objective: 'a' });
    expect(t[2]).toMatchObject({ kind: 'lesson', lesson: 'l2' });
  });
  it('does not schedule reviews that are not due yet', () => {
    const states = { a: { ...emptyState(), score: 70, dueAt: NOW + 3600e3 } };
    expect(nextTasks(input({ states })).some((x) => x.kind === 'review')).toBe(false);
  });
  it('suggests practising the weakest taught objectives', () => {
    const states = { a: { ...emptyState(), score: 30, lastCorrectAt: NOW }, b: { ...emptyState(), score: 75, lastCorrectAt: NOW } };
    const t = nextTasks(input({ states, lessonsDone: { l1: { done: true }, l2: { done: true } } }));
    const practice = t.filter((x) => x.kind === 'practice');
    expect(practice[0]).toMatchObject({ objective: 'a' });
  });
  it('offers a mock exam once 70% of objectives are taught', () => {
    const done = { l1: { done: true }, l2: { done: true }, l3: { done: true } };
    expect(nextTasks(input({ lessonsDone: done })).some((x) => x.kind === 'mock')).toBe(true);
    expect(nextTasks(input({ lessonsDone: done, mockCount: 3 })).some((x) => x.kind === 'mock')).toBe(false);
  });
  it('urgency favours weak, important objectives and the exam being close', () => {
    const s = emptyState();
    expect(urgency(obj('x', 1), s, 30, NOW)).toBeGreaterThan(urgency(obj('y', 3), s, 30, NOW));
    expect(urgency(obj('x', 1), s, 6, NOW)).toBeGreaterThan(urgency(obj('x', 1), s, 30, NOW));
    expect(urgency(obj('x', 1), { ...s, score: 90, lastCorrectAt: NOW }, 30, NOW)).toBeLessThan(urgency(obj('x', 1), s, 30, NOW));
  });
});

describe('bootCampSchedule', () => {
  it('fits the days to the hours available and compresses when short', () => {
    const roomy = bootCampSchedule(modules, lessons, { mon: 5, tue: 5, wedMin: 60 });
    expect(roomy.mon.compressed).toBe(false);
    expect(roomy.mon.modules.map((m) => m.id)).toEqual([0]);
    expect(roomy.tue.modules.map((m) => m.id)).toEqual([1]);
    expect(roomy.mon.modules[0].minutes).toBe(20);
    const tight = bootCampSchedule(modules, lessons, { mon: 0.5, tue: 5, wedMin: 30 });
    expect(tight.mon.compressed).toBe(true);
    expect(tight.mon.modules[0].minutes).toBeLessThan(20);
    expect(tight.wed.minutes).toBe(30);
    expect(roomy.tue.assessment).toMatch(/mock/i);
  });
});
