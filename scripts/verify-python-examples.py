"""Execute the published Colab cells and compare their displayed text output.

Needs numpy scipy pandas matplotlib. The upload cell uses a local test double;
this checks parsing and output, not the live Colab upload dialog.
"""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import types

os.environ.setdefault('MPLBACKEND', 'Agg')
ROOT = Path(__file__).resolve().parent.parent
data = json.loads(subprocess.check_output(
    ['node', str(ROOT / 'scripts/export-python-examples.mjs')], cwd=ROOT, encoding='utf-8'))

def run(code, namespace):
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        exec(compile(code, '<published Colab cell>', 'exec'), namespace)
    return output.getvalue().strip()

failures = []
passed = 0
for example in data['examples']:
    try:
        actual = run(example['code'], {})
        expected = example['output'].strip()
        if '--show' in sys.argv:
            print(example['id'] + ':\n' + actual + '\n')
        if actual != expected:
            failures.append(f"{example['id']}: expected {expected!r}; got {actual!r}")
        else:
            passed += 1
    except Exception as exc:
        failures.append(f"{example['id']}: {type(exc).__name__}: {exc}")

# Colab-specific upload API is mocked using the exact downloadable practice CSV.
google = types.ModuleType('google')
colab = types.ModuleType('google.colab')
files = types.ModuleType('google.colab.files')
files.upload = lambda: {'quant-camp-practice.csv': data['csv'].encode('utf-8')}
colab.files = files
google.colab = colab
with contextlib.ExitStack() as stack:
    original = {k: sys.modules.get(k) for k in ('google', 'google.colab', 'google.colab.files')}
    for key, module in (('google', google), ('google.colab', colab), ('google.colab.files', files)):
        sys.modules[key] = module
    namespace = {}
    for step in data['steps']:
        if not step.get('code'):
            continue
        try:
            actual = run(step['code'], namespace)
            if step['id'] == 'plot':
                import matplotlib.pyplot as plt
                assert len(plt.gca().lines) == 2
                plt.close('all')
            elif actual != step.get('output', '').strip():
                failures.append(f"Colab {step['id']}: expected {step.get('output')!r}; got {actual!r}")
                continue
            passed += 1
        except Exception as exc:
            failures.append(f"Colab {step['id']}: {type(exc).__name__}: {exc}")
    for key, module in original.items():
        if module is None:
            sys.modules.pop(key, None)
        else:
            sys.modules[key] = module

print(f'Python examples: {passed} passed, {len(failures)} failed')
for failure in failures:
    print('  ' + failure)
sys.exit(bool(failures))
