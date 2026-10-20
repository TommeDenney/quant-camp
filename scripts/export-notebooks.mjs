import { mkdirSync, writeFileSync } from 'node:fs';
import { COLAB_STEPS, PRACTICE_CSV } from '../src/content/colab.ts';
import { PY_EXAMPLES } from '../src/content/python.ts';
import { colabNotebook, notebook } from '../src/lib/notebook.ts';

const directory = new URL('../public/notebooks/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('quant-camp-colab-starter.ipynb', directory), colabNotebook(COLAB_STEPS));
writeFileSync(new URL('quant-camp-examples.ipynb', directory), notebook(PY_EXAMPLES));
writeFileSync(new URL('quant-camp-practice.csv', directory), PRACTICE_CSV);
console.log(`Exported Colab starter, ${PY_EXAMPLES.length} course examples, and practice CSV.`);
