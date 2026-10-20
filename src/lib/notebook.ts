import type { ColabStep } from '../content/colab';
import type { PyExample } from '../content/python';

const lines = (s: string) => s.replace(/\n$/, '').split('\n').map((l, i, a) => i < a.length - 1 ? `${l}\n` : l);
const mdCell = (s: string) => ({ cell_type: 'markdown', metadata: {}, source: lines(s) });
const codeCell = (s: string) => ({ cell_type: 'code', metadata: {}, execution_count: null, outputs: [], source: lines(s) });
const pack = (cells: object[]) => JSON.stringify({
  cells: cells.map((cell, i) => ({ ...cell, id: `cell-${i}` })),
  metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' }, language_info: { name: 'python' }, colab: { provenance: [] } },
  nbformat: 4, nbformat_minor: 5,
}, null, 1);

export function notebook(exs: PyExample[]) {
  return pack([
    mdCell('# Quant Camp: Python examples\nOpen in Google Colab with File > Upload notebook. Run each example in order. Each example defines its own imports and data.'),
    ...exs.flatMap((e) => [
      mdCell(`## ${e.title}\n\n**Task.** ${e.task}\n\n**Inputs.** ${e.inputs}\n\n**Assumptions.** ${e.assumptions}`),
      codeCell(e.code),
      mdCell(`**Expected output**\n\n\`\`\`\n${e.output}\n\`\`\`\n\n**Interpretation.** ${e.interpret}\n\n**Common mistakes**\n${e.mistakes.map((m) => `- ${m}`).join('\n')}`),
    ]),
  ]);
}

export function colabNotebook(steps: ColabStep[]) {
  return pack([
    mdCell('# Divine’s Colab practice\nA small guided notebook from Quant Camp. Download quant-camp-practice.csv from the Colab guide before running the upload cell. Run top to bottom and write your interpretation in text cells.\n\nGuide: https://research.google.com/colaboratory/faq.html'),
    ...steps.flatMap((s) => [
      mdCell(`## ${s.title}\n\n${s.instructions}`),
      ...(s.code ? [codeCell(s.code)] : []),
      mdCell(`${s.output ? `**Expected output**\n\n\`\`\`\n${s.output}\n\`\`\`\n\n` : ''}**Try it.** ${s.tryIt}\n\n**My interpretation:** `),
    ]),
  ]);
}
