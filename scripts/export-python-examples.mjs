// Node 22.18+ can strip these data-only TypeScript modules without a build.
import { PY_EXAMPLES } from '../src/content/python.ts';
import { COLAB_STEPS, PRACTICE_CSV } from '../src/content/colab.ts';
process.stdout.write(JSON.stringify({ examples: PY_EXAMPLES, steps: COLAB_STEPS, csv: PRACTICE_CSV }));
