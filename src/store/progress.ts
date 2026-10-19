// Study progress, saved in this browser (localStorage). No account, no server.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyAttempt, emptyState, type Attempt, type ObjectiveState } from '../lib/mastery';

export interface Setup {
  done: boolean;
  hoursMon: number;
  hoursTue: number;
  minutesWed: number;
  confStats: number; // 1–5
  confPython: number; // 1–5
  examAt: string; // ISO local date-time of the exam
}
export interface MockResult {
  at: number;
  kind: string;
  score: number;
  total: number;
  byTopic: Record<string, [number, number]>; // topic → [correct, total]
  missed: string[];
  qids: string[];
}

interface State {
  setup: Setup;
  objectives: Record<string, ObjectiveState>;
  attempts: Attempt[];
  seen: Record<string, number>; // question id → times answered
  lessons: Record<string, { at: number; step: number; done: boolean }>;
  lastLesson: string | null;
  bookmarks: string[];
  notes: Record<string, string>;
  studyMs: number;
  mocks: MockResult[];
  stars: number;
  theme: 'dark' | 'light';
  reducedMotion: boolean;
  // actions
  saveSetup: (s: Partial<Setup>) => void;
  record: (a: Omit<Attempt, 'repeat' | 'at'> & { at?: number }) => { before: number; after: number; repeat: boolean };
  lessonStep: (id: string, step: number, done?: boolean) => void;
  toggleBookmark: (id: string) => void;
  setNote: (id: string, text: string) => void;
  addStudyTime: (ms: number) => void;
  addMock: (m: MockResult) => void;
  addStars: (n: number) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setReducedMotion: (v: boolean) => void;
  reset: () => void;
}

// Wednesday, October 21, 2026. The time is asked during setup (default 13:10 local).
export const DEFAULT_EXAM = '2026-10-21T13:10';
const initial = {
  setup: { done: false, hoursMon: 4, hoursTue: 5, minutesWed: 60, confStats: 2, confPython: 3, examAt: DEFAULT_EXAM },
  objectives: {}, attempts: [], seen: {}, lessons: {}, lastLesson: null, bookmarks: [], notes: {}, studyMs: 0, mocks: [], stars: 0,
  theme: (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') as 'dark' | 'light',
  reducedMotion: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
};

export const examTime = (s: Setup) => new Date(s.examAt).getTime();
export const hoursLeft = (s: Setup, now = Date.now()) => Math.max(0, (examTime(s) - now) / 3600e3);

export const useProgress = create<State>()(persist((set, get) => ({
  ...initial,
  saveSetup: (s) => set({ setup: { ...get().setup, ...s } }),
  record: (a) => {
    const st = get();
    const at = a.at ?? Date.now();
    const repeat = (st.seen[a.qid] || 0) > 0;
    const prev = st.objectives[a.objective] || emptyState();
    const next = applyAttempt(prev, { ...a, at, repeat }, hoursLeft(st.setup, at));
    set({
      objectives: { ...st.objectives, [a.objective]: next },
      attempts: [...st.attempts, { ...a, at, repeat }].slice(-3000),
      seen: { ...st.seen, [a.qid]: (st.seen[a.qid] || 0) + 1 },
    });
    return { before: prev.score, after: next.score, repeat };
  },
  lessonStep: (id, step, done) => {
    const cur = get().lessons[id];
    set({ lessons: { ...get().lessons, [id]: { at: Date.now(), step: Math.max(step, cur?.step || 0), done: !!(done || cur?.done) } }, lastLesson: id });
  },
  toggleBookmark: (id) => { const b = get().bookmarks; set({ bookmarks: b.includes(id) ? b.filter((x) => x !== id) : [...b, id] }); },
  setNote: (id, text) => set({ notes: { ...get().notes, [id]: text } }),
  addStudyTime: (ms) => set({ studyMs: get().studyMs + ms }),
  addMock: (m) => set({ mocks: [...get().mocks, m] }),
  addStars: (n) => set({ stars: get().stars + n }),
  setTheme: (theme) => set({ theme }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  reset: () => set({ ...initial }),
}), { name: 'quant-camp.v1' }));
