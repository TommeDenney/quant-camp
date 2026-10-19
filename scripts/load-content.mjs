// Load the TypeScript curriculum (src/content/**) from Node without a TS runtime:
// bundle every content module with rolldown (ships with Vite) into one ESM file,
// import it, and collect lessons / questions / objectives / glossary entries by shape.
import { build } from 'rolldown';
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'content');

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f)) out.push(p);
  }
  return out;
}

const isLesson = (x) => x && typeof x === 'object' && typeof x.id === 'string' && 'why' in x && 'takeaway' in x;
const isQuestion = (x) => x && typeof x === 'object' && typeof x.id === 'string' && typeof x.prompt === 'string' && typeof x.type === 'string' && 'answer' in x;
const isObjective = (x) => x && typeof x === 'object' && typeof x.id === 'string' && Array.isArray(x.prereqs) && 'priority' in x && 'title' in x;
const isGlossary = (x) => x && typeof x === 'object' && typeof x.term === 'string' && typeof x.short === 'string';
const isModule = (x) => x && typeof x === 'object' && typeof x.id === 'number' && Array.isArray(x.lessons) && 'day' in x;

export async function loadContent() {
  const files = walk(CONTENT).filter((f) => !f.endsWith('types.ts'));
  const cache = join(ROOT, 'node_modules', '.cache', 'qc-content');
  mkdirSync(cache, { recursive: true });
  const entry = join(cache, 'entry.ts');
  const lines = files.map((f, i) => `import * as m${i} from ${JSON.stringify(relative(cache, f).replace(/\\/g, '/'))};`);
  lines.push(`export const mods = { ${files.map((f, i) => `${JSON.stringify(relative(CONTENT, f))}: m${i}`).join(', ')} };`);
  writeFileSync(entry, lines.join('\n'));
  const outFile = join(cache, `content-${Date.now()}.mjs`);
  await build({
    input: entry,
    platform: 'node',
    logLevel: 'silent',
    external: (id) => !id.startsWith('.') && !id.startsWith('/') && !/^[A-Za-z]:/.test(id),
    output: { file: outFile, format: 'esm' },
    write: true,
  });
  const { mods } = await import(pathToFileURL(outFile).href);

  const seen = new Set();
  const take = (pred) => {
    const out = [];
    for (const [file, mod] of Object.entries(mods)) {
      for (const [name, val] of Object.entries(mod)) {
        const arr = Array.isArray(val) ? val : val && typeof val === 'object' && !Array.isArray(val) ? Object.values(val) : [];
        for (const x of arr) if (pred(x) && !seen.has(x)) { seen.add(x); out.push({ ...x, __file: file, __export: name }); }
      }
    }
    return out;
  };
  const modules = take(isModule);
  const lessons = take(isLesson);
  const questions = take(isQuestion);
  const objectives = take(isObjective);
  const glossary = take(isGlossary);
  return { files: files.map((f) => relative(ROOT, f)), modules, lessons, questions, objectives, glossary };
}
