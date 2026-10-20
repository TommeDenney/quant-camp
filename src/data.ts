// Collects the curriculum from src/content. Any content file can export arrays named
// LESSONS*, QUESTIONS*, OBJECTIVES* or GLOSSARY* (e.g. QUESTIONS_M3); they are merged
// here, so content can be split across files and still load independently.
import type { Lesson, Module, Objective, Question, SourceRef } from './content/types';
import { MODULES as BASE_MODULES } from './content/modules';
import { registerGlossary } from './content/glossaryIndex';

export interface GlossaryEntry { term: string; short: string; md?: string; aliases?: string[]; sources?: SourceRef[]; source?: SourceRef }

const files = import.meta.glob('./content/**/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
function gather<T>(prefix: string): T[] {
  const out: T[] = [];
  for (const [path, mod] of Object.entries(files)) {
    if (path.endsWith('.test.ts')) continue;
    for (const [name, val] of Object.entries(mod)) if (name.toUpperCase().startsWith(prefix) && Array.isArray(val)) out.push(...(val as T[]));
  }
  return out;
}

export const LESSONS: Lesson[] = gather<Lesson>('LESSONS').sort((a, b) => a.module - b.module || a.id.localeCompare(b.id, undefined, { numeric: true }));
export const QUESTIONS: Question[] = gather<Question>('QUESTIONS');
export const GLOSSARY: GlossaryEntry[] = gather<GlossaryEntry>('GLOSSARY').sort((a, b) => a.term.localeCompare(b.term));
registerGlossary(GLOSSARY);

/** Objectives: declared ones, plus any referenced by lessons/questions but not declared. */
const declared = gather<Objective>('OBJECTIVES');
const ids = new Set(declared.map((o) => o.id));
const implied: Objective[] = [];
for (const q of QUESTIONS) if (!ids.has(q.objective)) { ids.add(q.objective); implied.push({ id: q.objective, module: q.module, title: q.subtopic || q.topic, prereqs: [], priority: 2, sources: q.source }); }
for (const l of LESSONS) for (const o of l.objectives) if (!ids.has(o)) { ids.add(o); implied.push({ id: o, module: l.module, title: o, prereqs: [], priority: 2, sources: l.sources }); }
export const OBJECTIVES: Objective[] = [...declared, ...implied];

export const MODULES: Module[] = BASE_MODULES.map((m) => ({
  ...m,
  lessons: m.lessons.length ? m.lessons : LESSONS.filter((l) => l.module === m.id).map((l) => l.id),
}));

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const objectiveById = (id: string) => OBJECTIVES.find((o) => o.id === id);
export const moduleById = (id: number) => MODULES.find((m) => m.id === id);
export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);
/** The first lesson that teaches an objective (for remediation links). */
export const lessonForObjective = (oid: string) => LESSONS.find((l) => l.objectives.includes(oid));

export const FILE_NAMES: Record<SourceRef['file'], string> = {
  review: 'Quiz 1 Review', 'L01-02': 'Lecture 1–2', 'L03-04': 'Lecture 3–4', 'L05-06': 'Lecture 5–6', 'L07-08': 'Lecture 7–8', 'L09-10': 'Lecture 9–10',
};
/** "Lecture 3–4, slides 22–25" */
export function citeSource(s: SourceRef) {
  const p = [...s.pages].sort((a, b) => a - b);
  const runs: string[] = [];
  for (let i = 0; i < p.length;) {
    let j = i;
    while (j + 1 < p.length && p[j + 1] === p[j] + 1) j++;
    runs.push(i === j ? `${p[i]}` : `${p[i]}–${p[j]}`);
    i = j + 1;
  }
  return `${FILE_NAMES[s.file]}, slide${p.length > 1 ? 's' : ''} ${runs.join(', ')}${s.note ? ` (${s.note})` : ''}`;
}
