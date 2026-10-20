// Open-note helpers: for any question, where in the notes the answer lives.
import type { Question, SourceRef } from '../content/types';
import { REFERENCE } from '../content/reference';

/** The reference-sheet section for a module (sections are titled "3. Hypothesis testing" …). */
export function refForModule(module: number) {
  return REFERENCE.find((s) => s.title.startsWith(`${module}.`));
}

/** The lecture files a question draws on, most specific first (the review deck last). */
export function lectureFiles(q: Question): SourceRef['file'][] {
  const files = [...new Set(q.source.map((s) => s.file))];
  return [...files.filter((f) => f !== 'review'), ...files.filter((f) => f === 'review')];
}

export const LECTURES: SourceRef['file'][] = ['L01-02', 'L03-04', 'L05-06', 'L07-08', 'L09-10'];
