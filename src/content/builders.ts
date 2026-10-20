// Shared shape only: each module supplies its own explanations, examples and checks.
import type { Block, Lesson, Objective, Question, SourceRef, VizId } from './types';

export interface TeachingUnit {
  key: string; title: string; sources: SourceRef[]; prereqs: string[];
  why: string; prerequisite: string; paragraphs: string[]; formula: string;
  viz: VizId; caption: string; example: string; steps: string[];
  predict: [string, string[], number, string]; takeaway: string;
  erratum?: string;
}
export function teach(module: number, units: TeachingUnit[]) {
  const objectives: Objective[] = units.map(u => ({ id: `m${module}.${u.key}`, module,
    title: u.title, prereqs: u.prereqs, priority: 1, sources: u.sources }));
  const lessons: Lesson[] = units.map((u, i) => ({
    id: `m${module}-l${i + 1}`, module, title: u.title, minutes: 10,
    objectives: [`m${module}.${u.key}`], sources: u.sources,
    why: [{ kind: 'text', md: u.why }], prereq: [{ kind: 'text', md: u.prerequisite }],
    plain: [...u.paragraphs.map(md => ({ kind: 'text', md, provenance: 'explanation' } as Block)),
      { kind: 'math', tex: u.formula } as Block,
      ...(u.erratum ? [{ kind: 'callout', tone: 'erratum', md: u.erratum } as Block] : [])],
    visual: [{ kind: 'viz', id: u.viz, caption: u.caption }],
    worked: [{ kind: 'steps', title: u.example, steps: u.steps.map(md => ({ md })) }],
    interact: [{ kind: 'predict', prompt: u.predict[0], options: u.predict[1], answer: u.predict[2], reveal: u.predict[3], viz: u.viz }],
    check: [1, 2, 3].map(n => `m${module}-q${String(i * 8 + n).padStart(2, '0')}`),
    takeaway: u.takeaway,
  }));
  return { objectives, lessons };
}

export function bank(module: number, topic: string, key: string, sources: SourceRef[], offset = 0) {
  let n = offset;
  const base = (prompt: string, explanation: string, difficulty: 1 | 2 | 3) => ({
    id: `m${module}-q${String(++n).padStart(2, '0')}`, module, topic, subtopic: key,
    objective: `m${module}.${key}`, prompt, explanation, difficulty, source: sources, prereqs: [],
  });
  return {
    mc(prompt: string, correct: string, wrong: [string, string, string], explanation: string, difficulty: 1 | 2 | 3 = 2): Question {
      const b = base(prompt, explanation, difficulty);
      // Rotate the position so stored-order readers do not learn an answer pattern.
      const answer = (n - 1) % 4;
      const choices: string[] = [...wrong]; choices.splice(answer, 0, correct);
      return { ...b, type: 'mc', choices, answer };
    },
    num(prompt: string, answer: number, py: string, explanation: string, tolerance = 0.001, difficulty: 1 | 2 | 3 = 2): Question {
      return { ...base(prompt, explanation, difficulty), type: 'numeric', answer, tolerance, check: { py }, exam: false };
    },
  };
}
