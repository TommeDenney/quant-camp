// Prefer this project's venv, then a caller-selected Python, then system Python.
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const candidates = [
  process.env.QC_PYTHON,
  resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'),
  'python3', 'python', ...(process.platform === 'win32' ? ['py'] : []),
].filter(Boolean);
let python;
for (const candidate of candidates) {
  if (candidate.includes('/') || candidate.includes('\\')) {
    if (!existsSync(candidate)) continue;
  }
  const probe = spawnSync(candidate, ['-c', 'import numpy, scipy'], { stdio: 'ignore' });
  if (probe.status === 0) { python = candidate; break; }
}
if (!python) {
  console.error('No Python with NumPy/SciPy found. Install numpy scipy statsmodels in .venv, or set QC_PYTHON to its Python executable.');
  process.exit(2);
}
const args = process.argv.slice(2);
const script = args.includes('--examples') ? 'scripts/verify-python-examples.py' : 'scripts/verify-questions.py';
const result = spawnSync(python, [script, ...args.filter((arg) => arg !== '--examples')], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
