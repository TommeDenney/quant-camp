#!/usr/bin/env python3
"""Verify computational questions against NumPy / SciPy.

Every question may carry `check: { py: "<python expression>" }`. The expression is
evaluated with `np`, `st` (scipy.stats), `scipy`, `math`, `sm` (statsmodels.api) and
`acf` (statsmodels acf) in scope:

  * numeric questions: the value must equal `answer` within `tolerance`
    (default: 0.5% relative, or 1e-9 absolute for exact values)
  * mc / tf questions: a boolean must be True; a number must match the first number in
    the correct choice (within the same tolerance), and must NOT match any other choice
  * multi questions: a list of booleans (one per choice) must equal the answer set

Numeric questions without a check are listed as "unverified" and fail verification.

Usage: python3 scripts/verify-questions.py   (needs numpy, scipy, statsmodels)
"""
import argparse
import json
import math
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--input', type=Path, help='Verify an already exported questions JSON file')
args = parser.parse_args()
OUT = args.input or ROOT / 'node_modules' / '.cache' / 'qc-questions.json'

try:
    import numpy as np
    import scipy
    import scipy.stats as st
except ImportError as e:  # pragma: no cover
    print(f'verify-questions: missing Python package ({e}). Install numpy scipy statsmodels.')
    sys.exit(2)

# Statsmodels is needed only by checks that use sm or acf. Missing it must not
# prevent the remaining NumPy/SciPy checks from being evaluated.
try:
    import statsmodels.api as sm
    from statsmodels.tsa.stattools import acf
except ImportError:
    sm = acf = None

if args.input is None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['node', str(ROOT / 'scripts' / 'export-questions.mjs'), str(OUT)], check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
data = json.loads(OUT.read_text(encoding='utf-8'))
questions = data['questions']

NUM = re.compile(r'[-−]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?')


def first_number(text):
    t = re.sub(r'\$[^$]*?=', '', str(text))  # skip "x =" inside math
    m = NUM.search(t.replace('−', '-').replace(',', ''))
    return float(m.group(0)) if m else None


def close(a, b, tol=None):
    if tol is not None:
        return abs(a - b) <= tol + 1e-12
    return abs(a - b) <= max(1e-9, 0.005 * abs(b))


env = {'np': np, 'st': st, 'scipy': scipy, 'math': math, 'sm': sm, 'acf': acf}
failures, passed, unverified = [], 0, []
for q in questions:
    chk = (q.get('check') or {}).get('py')
    if not chk:
        if q['type'] == 'numeric':
            unverified.append(q['id'])
        continue
    try:
        val = eval(chk, dict(env))  # trusted, local, our own content
    except Exception as e:  # noqa: BLE001
        failures.append(f"{q['id']}: check raised {type(e).__name__}: {e}")
        continue
    tol = q.get('tolerance')
    t = q['type']
    ok, why = True, ''
    if isinstance(val, (bool, np.bool_)) and t in ('mc', 'tf', 'numeric'):
        ok = bool(val)
        why = 'check expression is False'
    elif t == 'numeric':
        ok = close(float(val), float(q['answer']), tol)
        why = f'computed {float(val):.6g} vs answer {q["answer"]} (tol {tol})'
    elif t in ('mc', 'tf'):
        choices = q.get('choices') or []
        want = first_number(choices[q['answer']]) if choices else None
        if want is None:
            ok, why = False, 'correct choice has no number to compare'
        else:
            # Tolerance: the precision the choice is written to.
            text = str(choices[q['answer']])
            m = re.search(r'\d+\.(\d+)', text)
            ctol = tol if tol is not None else (0.5 * 10 ** -len(m.group(1)) if m else 0.5)
            ok = close(float(val), want, ctol)
            why = f'computed {float(val):.6g} vs correct choice {want}'
            if ok:
                for i, c in enumerate(choices):
                    if i == q['answer']:
                        continue
                    other = first_number(c)
                    if other is not None and close(float(val), other, ctol):
                        ok, why = False, f'computed {float(val):.6g} also matches wrong choice {i} ({c})'
                        break
    elif t == 'multi':
        flags = [bool(x) for x in val]
        ok = sorted(i for i, f in enumerate(flags) if f) == sorted(q['answer'])
        why = f'computed set {[i for i, f in enumerate(flags) if f]} vs answer {q["answer"]}'
    else:
        ok, why = False, f'checks are not supported for type {t}'
    if ok:
        passed += 1
    else:
        failures.append(f"{q['id']}: {why}")

print(f'verify-questions: {len(questions)} questions · {passed} computational checks passed · {len(failures)} failed · {len(unverified)} numeric without a check')
if unverified:
    print('  unverified numeric:', ', '.join(unverified[:40]) + (' …' if len(unverified) > 40 else ''))
for f in failures:
    print('  ✗', f)
sys.exit(1 if failures or unverified else 0)
