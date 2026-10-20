import { describe, expect, it } from 'vitest';
import { COLAB_STEPS } from '../../src/content/colab';
import { PY_EXAMPLES } from '../../src/content/python';
import { colabNotebook, notebook } from '../../src/lib/notebook';

type Cell = { id: string; cell_type: string; source: string[]; execution_count?: null; outputs?: unknown[] };
const parse = (json: string) => JSON.parse(json) as { nbformat: number; nbformat_minor: number; cells: Cell[]; metadata: { kernelspec: { name: string } } };

describe('downloadable Colab notebooks', () => {
  it('exports every Python example as an unexecuted code cell with guidance', () => {
    const nb = parse(notebook(PY_EXAMPLES));
    expect(nb.nbformat).toBe(4);
    expect(nb.metadata.kernelspec.name).toBe('python3');
    const code = nb.cells.filter((c) => c.cell_type === 'code');
    expect(code).toHaveLength(PY_EXAMPLES.length);
    code.forEach((c, i) => {
      expect(c.source.join('')).toBe(PY_EXAMPLES[i].code.replace(/\n$/, ''));
      expect(c.execution_count).toBeNull();
      expect(c.outputs).toEqual([]);
    });
    const text = nb.cells.filter((c) => c.cell_type === 'markdown').map((c) => c.source.join('')).join('\n');
    for (const ex of PY_EXAMPLES) {
      expect(text).toContain(ex.title);
      expect(text).toContain(ex.interpret);
    }
  });
  it('keeps Colab code cells in tutorial order and includes prediction prompts', () => {
    const nb = parse(colabNotebook(COLAB_STEPS));
    expect(nb.cells.filter((c) => c.cell_type === 'code').map((c) => c.source.join('')))
      .toEqual(COLAB_STEPS.filter((s) => s.code).map((s) => s.code!.replace(/\n$/, '')));
    expect(nb.cells[0].source.join('')).toContain('quant-camp-practice.csv');
    for (const step of COLAB_STEPS) {
      expect(nb.cells.some((c) => c.source.join('').includes(step.tryIt))).toBe(true);
    }
  });
  it('assigns unique valid cell ids required by notebook format 4.5', () => {
    for (const nb of [parse(notebook(PY_EXAMPLES)), parse(colabNotebook(COLAB_STEPS))]) {
      expect(new Set(nb.cells.map((c) => c.id)).size).toBe(nb.cells.length);
      expect(nb.cells.every((c) => /^[A-Za-z0-9_-]{1,64}$/.test(c.id))).toBe(true);
    }
  });
});
