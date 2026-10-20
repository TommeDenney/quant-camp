import type { Block, Lesson } from '../content/types';
import { citeSource } from '../data';
import { refForModule } from './notes';
import { codeCell, mdCell, pack } from './notebook';

// Lesson notes for her own Colab file: one text cell per lesson, plus the lesson's Python.

const plainText = (s: string) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, term, label) => label || term).trim();
const STEP_KEYS = ['why', 'prereq', 'plain', 'visual', 'worked', 'interact'] as const;
const blocksOf = (l: Lesson): Block[] => STEP_KEYS.flatMap((k) => l[k] || []);

/** One Markdown text cell for a lesson: takeaway, formulas, where to look, and her own notes. Colab renders $math$. */
export function lessonMarkdown(l: Lesson, myNotes = '') {
  const formulas = blocksOf(l).filter((b): b is Extract<Block, { kind: 'math' }> => b.kind === 'math');
  const ref = refForModule(l.module);
  return [
    `## ${l.module}. ${plainText(l.title)}`,
    `**Key takeaway.** ${plainText(l.takeaway)}`,
    formulas.length ? `**Formulas**\n\n${formulas.map((f) => `$$${f.tex}$$${f.caption ? `\n${plainText(f.caption)}` : ''}`).join('\n\n')}` : '',
    `**Where to look.** ${l.sources.map(citeSource).join('; ')}${ref ? `. Reference sheet: ${ref.title}` : ''}`,
    `**My notes.** ${myNotes.trim() || '(write here)'}`,
  ].filter(Boolean).join('\n\n');
}

/** The lesson's Python, one cell per code block. */
export const lessonCode = (l: Lesson) => blocksOf(l).filter((b): b is Extract<Block, { kind: 'code' }> => b.kind === 'code').map((b) => `# ${b.title}\n${b.code}`);

/** A notebook of lesson notes, to open in Colab and copy cells into her own file. */
export function lessonsNotebook(ls: Lesson[], notes: Record<string, string>) {
  return pack([
    mdCell('# Quant Camp: lesson notes\nOne text cell per lesson (takeaway, formulas, where to look, your notes), followed by any Python from the lesson. To move cells into your own notebook: select a cell, Edit > Copy cell, then paste it in your notebook.'),
    ...ls.flatMap((l) => [mdCell(lessonMarkdown(l, notes[l.id])), ...lessonCode(l).map(codeCell)]),
  ]);
}
