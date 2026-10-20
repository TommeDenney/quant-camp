import { describe, expect, it } from 'vitest';
import { LESSONS } from '../../src/data';
import { lessonMarkdown, lessonsNotebook } from '../../src/lib/lessonNotes';

describe('lesson notes for Colab', () => {
  it('builds a valid notebook with a text cell per lesson', () => {
    const nb = JSON.parse(lessonsNotebook(LESSONS, { [LESSONS[0].id]: 'my note' }));
    expect(nb.nbformat).toBe(4);
    expect(nb.cells.filter((c: { cell_type: string }) => c.cell_type === 'markdown').length).toBe(LESSONS.length + 1);
    expect(nb.cells[1].source.join('')).toContain('my note');
  });
  it('keeps the takeaway and sources and strips glossary links', () => {
    for (const l of LESSONS) {
      const md = lessonMarkdown(l);
      expect(md).toContain('**Key takeaway.**');
      expect(md).toContain('**Where to look.**');
      expect(md).not.toMatch(/\[\[/);
    }
    if (process.env.SHOW) console.log(lessonMarkdown(LESSONS.find((l) => l.module === 3)!));
  });
});
