// Tagged template for content text: backslashes stay as typed (so LaTeX reads
// naturally, e.g. md`$\hat\sigma^2$`) and \` gives a literal backtick for code spans.
export const md = (s: TemplateStringsArray, ...v: unknown[]) => String.raw({ raw: s.raw }, ...v).replace(/\\`/g, '`');

import type { SourceRef } from './types';
/** Source helpers: src('L03-04', 22, 25) → slides 22–25 of Lecture 3–4. */
export const src = (file: SourceRef['file'], from: number, to = from, note?: string): SourceRef => ({
  file, pages: Array.from({ length: to - from + 1 }, (_, i) => from + i), ...(note ? { note } : {}),
});
