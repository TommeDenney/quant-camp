#!/usr/bin/env node
// Content validator for Quant Camp (`npm run validate`).
// Checks structure, references, answers, math and coverage of the curriculum, prints a
// report with counts, and exits non-zero when there are errors.
import katex from 'katex';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent, ROOT } from './load-content.mjs';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const SOURCE_FILES = ['review', 'L01-02', 'L03-04', 'L05-06', 'L07-08', 'L09-10'];
// Page counts from the extracted index (falls back to the known counts when sources aren't extracted).
const PAGE_COUNTS = { review: 12, 'L01-02': 64, 'L03-04': 79, 'L05-06': 71, 'L07-08': 58, 'L09-10': 53 };
try {
  const idx = JSON.parse(readFileSync(join(ROOT, 'curriculum', 'extracted', 'index.json'), 'utf8'));
  for (const [k, v] of Object.entries(idx)) PAGE_COUNTS[k] = v.pages;
} catch { /* not extracted on this machine */ }

const QTYPES = new Set(['mc', 'multi', 'tf', 'numeric', 'order', 'match']);
const LESSON_STEPS = ['why', 'prereq', 'plain', 'visual', 'worked', 'interact'];
const VIZ = new Set(['distribution', 'moments', 'pdfcdf', 'bayes', 'tails', 'testpicker', 'permutation', 'bootstrap', 'acf', 'ar1', 'filtering', 'spectral', 'regression', 'crossval', 'attribution']);

const { files, modules, lessons, questions, objectives, glossary } = await loadContent();
const contentLanded = lessons.length > 0 || questions.length > 0;
// Coverage gaps (empty modules, untaught objectives) are errors with --strict (release check),
// warnings otherwise so partial content can still be deployed while it's being written.
const STRICT = process.argv.includes('--strict');
const strict = (m) => (STRICT && contentLanded ? err(m) : warn(m));

// ---- helpers ------------------------------------------------------------------------
function count(arr, key) { return arr.reduce((m, x) => { const k = typeof key === 'function' ? key(x) : x[key]; m[k] = (m[k] || 0) + 1; return m; }, {}); }
function checkSources(where, refs, { required = true } = {}) {
  if (!Array.isArray(refs) || refs.length === 0) { if (required) err(`${where}: no source references`); return; }
  for (const r of refs) {
    if (!SOURCE_FILES.includes(r.file)) { err(`${where}: unknown source file "${r.file}"`); continue; }
    if (!Array.isArray(r.pages) || r.pages.length === 0) { err(`${where}: source ${r.file} has no pages`); continue; }
    for (const p of r.pages) if (!Number.isInteger(p) || p < 1 || p > PAGE_COUNTS[r.file]) err(`${where}: ${r.file} page ${p} out of range 1–${PAGE_COUNTS[r.file]}`);
  }
}
function mathIn(text) {
  const out = [];
  if (typeof text !== 'string') return out;
  const re = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let m;
  while ((m = re.exec(text))) out.push({ tex: m[1] ?? m[2], display: !!m[1] });
  return out;
}
function checkMath(where, text) {
  for (const { tex, display } of mathIn(text)) {
    try { katex.renderToString(tex, { throwOnError: true, displayMode: display, strict: 'ignore' }); } catch (e) { err(`${where}: KaTeX error in "${tex.slice(0, 60)}": ${String(e.message).split('\n')[0]}`); }
  }
}
function checkTex(where, tex) {
  try { katex.renderToString(tex, { throwOnError: true, displayMode: true, strict: 'ignore' }); } catch (e) { err(`${where}: KaTeX error in block "${String(tex).slice(0, 60)}": ${String(e.message).split('\n')[0]}`); }
}
const glossaryTerms = new Set();
for (const g of glossary) { glossaryTerms.add(g.term.toLowerCase()); for (const a of g.aliases || []) glossaryTerms.add(String(a).toLowerCase()); }
function checkGloss(where, text) {
  if (typeof text !== 'string') return;
  for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) if (!glossaryTerms.has(m[1].toLowerCase())) err(`${where}: glossary term [[${m[1]}]] not defined`);
}
function checkText(where, text) { checkMath(where, text); checkGloss(where, text); }

// ---- the app only loads arrays exported as LESSONS* / QUESTIONS* / OBJECTIVES* / GLOSSARY* (any case; see src/data.ts)
{
  const want = { lessons: 'LESSONS', questions: 'QUESTIONS', objectives: 'OBJECTIVES', glossary: 'GLOSSARY' };
  for (const [kind, list] of Object.entries({ lessons, questions, objectives, glossary })) {
    const bad = new Map();
    for (const x of list) if (!String(x.__export).toUpperCase().startsWith(want[kind])) bad.set(`${x.__file}:${x.__export}`, (bad.get(`${x.__file}:${x.__export}`) || 0) + 1);
    for (const [k, n] of bad) err(`${k}: ${n} ${kind} exported under a name the app does not load (must start with ${want[kind]})`);
  }
}

// ---- objectives & prerequisite graph -----------------------------------------------------
const objIds = new Set();
for (const o of objectives) {
  if (objIds.has(o.id)) err(`objective ${o.id}: duplicate id`);
  objIds.add(o.id);
  checkSources(`objective ${o.id}`, o.sources);
}
for (const o of objectives) for (const p of o.prereqs) if (!objIds.has(p)) err(`objective ${o.id}: prerequisite "${p}" does not exist`);
// Cycle detection (DFS)
{
  const state = new Map();
  const byId = new Map(objectives.map((o) => [o.id, o]));
  const visit = (id, path) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { err(`prerequisite cycle: ${[...path, id].join(' → ')}`); return; }
    state.set(id, 1);
    for (const p of byId.get(id)?.prereqs || []) visit(p, [...path, id]);
    state.set(id, 2);
  };
  for (const o of objectives) visit(o.id, []);
}

// ---- modules -------------------------------------------------------------------------------
const lessonIds = new Set();
for (const l of lessons) { if (lessonIds.has(l.id)) err(`lesson ${l.id}: duplicate id`); lessonIds.add(l.id); }
for (let id = 0; id <= 13; id++) {
  const m = modules.find((x) => x.id === id);
  if (!m) { err(`module ${id} is missing`); continue; }
  const ls = lessons.filter((l) => l.module === id);
  if (ls.length === 0 && m.lessons.length === 0) strict(`module ${id} (${m.title}) has no lessons`);
  for (const lid of m.lessons) if (!lessonIds.has(lid)) err(`module ${id}: lists lesson "${lid}" which does not exist`);
}

// ---- lessons -------------------------------------------------------------------------------
function checkBlocks(where, blocks) {
  if (!Array.isArray(blocks)) { err(`${where}: not a list of blocks`); return; }
  blocks.forEach((b, i) => {
    const w = `${where}[${i}]`;
    switch (b.kind) {
      case 'text': case 'callout': case 'derivation': checkText(w, b.md); if (!b.md || !String(b.md).trim()) err(`${w}: empty text`); break;
      case 'math': checkTex(w, b.tex); break;
      case 'viz': if (!VIZ.has(b.id)) err(`${w}: unknown visualization "${b.id}"`); break;
      case 'predict':
        checkText(w, b.prompt); checkText(w, b.reveal);
        if (!Array.isArray(b.options) || b.options.length < 2) err(`${w}: predict needs ≥2 options`);
        else if (!Number.isInteger(b.answer) || b.answer < 0 || b.answer >= b.options.length) err(`${w}: predict answer out of range`);
        if (b.viz && !VIZ.has(b.viz)) err(`${w}: unknown visualization "${b.viz}"`);
        break;
      case 'steps': (b.steps || []).forEach((s, j) => { checkText(`${w}.step${j}`, s.md); if (s.tex) checkTex(`${w}.step${j}`, s.tex); }); if (!b.steps?.length) err(`${w}: steps block is empty`); break;
      case 'code': if (!b.code?.trim()) err(`${w}: empty code`); if (!Array.isArray(b.explain) || !b.explain.length) warn(`${w}: code block has no line-by-line explanation`); (b.explain || []).forEach((e) => checkText(w, e)); break;
      default: err(`${w}: unknown block kind "${b.kind}"`);
    }
  });
}
const qById = new Map(questions.map((q) => [q.id, q]));
for (const l of lessons) {
  const w = `lesson ${l.id}`;
  if (!Number.isInteger(l.module) || l.module < 0 || l.module > 13) err(`${w}: bad module ${l.module}`);
  if (!l.title) err(`${w}: no title`);
  if (!(l.minutes > 0 && l.minutes <= 20)) warn(`${w}: minutes = ${l.minutes} (expected 5–12)`);
  checkSources(w, l.sources);
  for (const s of LESSON_STEPS) { if (!Array.isArray(l[s]) || l[s].length === 0) err(`${w}: step "${s}" is empty`); else checkBlocks(`${w}.${s}`, l[s]); }
  if (!l.takeaway || !String(l.takeaway).trim()) err(`${w}: no key takeaway`); else checkText(`${w}.takeaway`, l.takeaway);
  if (!Array.isArray(l.objectives) || !l.objectives.length) err(`${w}: no objectives`);
  for (const o of l.objectives || []) if (!objIds.has(o)) err(`${w}: objective "${o}" does not exist`);
  if (!Array.isArray(l.check) || l.check.length < 2 || l.check.length > 4) err(`${w}: mini check should have 2–4 questions (has ${l.check?.length ?? 0})`);
  for (const q of l.check || []) if (!qById.has(q)) err(`${w}: check question "${q}" does not exist`);
}
const modOfLesson = new Map(lessons.map((l) => [l.id, l.module]));
for (const m of modules) for (const lid of m.lessons) if (modOfLesson.has(lid) && modOfLesson.get(lid) !== m.id) err(`module ${m.id}: lesson ${lid} says module ${modOfLesson.get(lid)}`);

// ---- questions -------------------------------------------------------------------------------
const qIds = new Set();
const prompts = new Map();
for (const q of questions) {
  const w = `question ${q.id}`;
  if (qIds.has(q.id)) err(`${w}: duplicate id`);
  qIds.add(q.id);
  if (!QTYPES.has(q.type)) { err(`${w}: invalid type "${q.type}"`); continue; }
  if (!Number.isInteger(q.module) || q.module < 0 || q.module > 13) err(`${w}: bad module ${q.module}`);
  if (![1, 2, 3].includes(q.difficulty)) err(`${w}: difficulty must be 1, 2 or 3`);
  if (!q.topic) err(`${w}: no topic`);
  if (!q.subtopic) warn(`${w}: no subtopic`);
  if (!q.explanation || !String(q.explanation).trim()) err(`${w}: no explanation`);
  if (!objIds.has(q.objective)) err(`${w}: objective "${q.objective}" does not exist`);
  for (const p of q.prereqs || []) if (!objIds.has(p)) err(`${w}: prerequisite "${p}" does not exist`);
  if (!Array.isArray(q.prereqs)) err(`${w}: prereqs must be a list`);
  checkSources(w, q.source);
  const norm = q.prompt.toLowerCase().replace(/\s+/g, ' ').trim();
  if (prompts.has(norm)) err(`${w}: duplicate prompt (same as ${prompts.get(norm)})`); else prompts.set(norm, q.id);
  checkText(`${w}.prompt`, q.prompt); checkText(`${w}.explanation`, q.explanation);
  (q.choices || []).forEach((c, i) => checkText(`${w}.choice${i}`, c));
  for (const [k, v] of Object.entries(q.distractors || {})) { checkText(`${w}.distractor${k}`, v); if (!q.choices || +k < 0 || +k >= q.choices.length) err(`${w}: distractor for choice ${k} which doesn't exist`); }
  const n = q.choices?.length || 0;
  const inRange = (i) => Number.isInteger(i) && i >= 0 && i < n;
  switch (q.type) {
    case 'mc':
      if (n < 3) err(`${w}: multiple choice needs ≥3 choices (has ${n})`);
      if (Array.isArray(q.answer)) err(`${w}: mc must have exactly one answer`); else if (!inRange(q.answer)) err(`${w}: answer ${q.answer} out of range`);
      if (new Set(q.choices).size !== n) err(`${w}: duplicate choices`);
      if (q.distractors && !Array.isArray(q.answer) && q.distractors[q.answer]) warn(`${w}: has a "distractor" note on the correct choice`);
      break;
    case 'tf':
      if (n !== 2) err(`${w}: true/false needs exactly 2 choices`);
      if (!inRange(q.answer)) err(`${w}: answer out of range`);
      break;
    case 'multi':
      if (!Array.isArray(q.answer) || q.answer.length < 1) err(`${w}: select-all needs ≥1 answer`);
      else { if (q.answer.some((i) => !inRange(i))) err(`${w}: answer index out of range`); if (new Set(q.answer).size !== q.answer.length) err(`${w}: duplicate answer indexes`); }
      if (n < 3) err(`${w}: select-all needs ≥3 choices`);
      break;
    case 'numeric':
      if (typeof q.answer !== 'number' || !Number.isFinite(q.answer)) err(`${w}: numeric answer must be a finite number`);
      if (q.tolerance != null && !(q.tolerance >= 0)) err(`${w}: tolerance must be ≥ 0`);
      if (q.exam) warn(`${w}: numeric question marked exam:true (mock exams are multiple choice)`);
      break;
    case 'order':
      if (n < 3) err(`${w}: ordering needs ≥3 steps`);
      break;
    case 'match':
      if (!Array.isArray(q.answer) || q.answer.length !== n) err(`${w}: match answer must give one right-index per left item`);
      else if (q.answer.some((i) => !Number.isInteger(i) || i < 0)) err(`${w}: bad match index`);
      for (const c of q.choices || []) if (!String(c).includes('|')) err(`${w}: match choices must be "left|right"`);
      break;
  }
  // Answer leakage: the correct choice text appearing verbatim in the prompt.
  if ((q.type === 'mc') && inRange(q.answer)) {
    const ans = String(q.choices[q.answer]).toLowerCase().trim();
    if (ans.length > 12 && q.prompt.toLowerCase().includes(ans)) warn(`${w}: the correct choice appears verbatim in the prompt`);
  }
  if (q.figure && !VIZ.has(q.figure.viz)) err(`${w}: unknown figure viz "${q.figure.viz}"`);
}
// Answer-position balance: if the UI shows choices in stored order, a favourite position leaks answers.
{
  const mcs = questions.filter((q) => q.type === 'mc' && Number.isInteger(q.answer));
  if (mcs.length >= 8) {
    const pos = count(mcs, (q) => q.answer);
    const [topPos, topN] = Object.entries(pos).sort((a, b) => b[1] - a[1])[0];
    if (topN / mcs.length > 0.4) warn(`answer position ${topPos} is correct in ${topN}/${mcs.length} multiple-choice questions; make sure the UI shuffles choices (or vary positions)`);
  }
}
// Questions whose objective is never taught by a lesson
const taught = new Set(lessons.flatMap((l) => l.objectives || []));
for (const o of objectives) if (!taught.has(o.id)) strict(`objective ${o.id} is not taught by any lesson`);
for (const o of objectives) if (!questions.some((q) => q.objective === o.id)) strict(`objective ${o.id} has no questions`);

// ---- glossary ---------------------------------------------------------------------------------
{
  const seenTerms = new Set();
  for (const g of glossary) {
    const k = g.term.toLowerCase();
    if (seenTerms.has(k)) err(`glossary: duplicate term "${g.term}"`);
    seenTerms.add(k);
    if (!g.short?.trim()) err(`glossary ${g.term}: empty definition`);
    checkMath(`glossary ${g.term}`, g.short); if (g.long) checkMath(`glossary ${g.term}.long`, g.long);
    if (g.sources) checkSources(`glossary ${g.term}`, g.sources, { required: false });
  }
}

// ---- review coverage (curriculum/source-map-draft.json or source-map.json) --------------------------
let coverage = null;
for (const f of ['source-map.json', 'source-map-draft.json']) {
  const p = join(ROOT, 'curriculum', f);
  if (!existsSync(p)) continue;
  try {
    const map = JSON.parse(readFileSync(p, 'utf8'));
    const topics = Array.isArray(map) ? map : map.reviewTopics || map.review || map.topics || [];
    // Topic entries may name objectives/lessons directly, or just a module + source file/pages
    // (then a lesson in that module must cite the same file within ±2 slides).
    const near = (t) => lessons.some((l) => l.module === t.module && (l.sources || []).some((s) => s.file === t.file && s.pages.some((pg) => (t.pages || []).some((q) => Math.abs(pg - q) <= 2))));
    for (const t of topics) if (t.file && t.pages) checkSources(`${f} "${t.topic}"`, [{ file: t.file, pages: t.pages }]);
    let ok = 0;
    const missing = [];
    for (const t of topics) {
      const objs = t.objectives || t.objectiveIds || [];
      const lessonsFor = t.lessons || [];
      const covered = objs.some((o) => taught.has(o)) || lessonsFor.some((l) => lessonIds.has(l)) || (t.module != null && near(t));
      if (covered) ok++; else missing.push(`M${t.module ?? '?'} ${t.topic || t.title || t.id || JSON.stringify(t).slice(0, 40)} (${t.file || ''} ${(t.pages || []).join(',')})`);
      for (const o of objs) if (contentLanded && !objIds.has(o)) err(`${f}: review topic "${t.topic || t.title}" maps to unknown objective ${o}`);
    }
    coverage = { file: f, total: topics.length, covered: ok, missing };
    for (const m of missing) strict(`review topic not covered by any lesson: ${m}`);
  } catch (e) { err(`${f}: not valid JSON (${e.message})`); }
  break;
}

// ---- report -------------------------------------------------------------------------------------
const report = {
  contentFiles: files.length,
  modules: modules.length,
  lessons: lessons.length,
  objectives: objectives.length,
  questions: questions.length,
  examQuestions: questions.filter((q) => q.exam !== false && (q.type === 'mc' || q.type === 'tf')).length,
  glossary: glossary.length,
  questionsByModule: count(questions, 'module'),
  questionsByType: count(questions, 'type'),
  questionsByDifficulty: count(questions, 'difficulty'),
  lessonsByModule: count(lessons, 'module'),
  reviewCoverage: coverage,
  errors: errors.length,
  warnings: warnings.length,
};
writeFileSync(join(ROOT, 'node_modules', '.cache', 'qc-validate-report.json'), JSON.stringify(report, null, 1));
console.log('Quant Camp content validation');
console.log(`  files ${report.contentFiles} · modules ${report.modules} · lessons ${report.lessons} · objectives ${report.objectives} · questions ${report.questions} (exam-eligible MC/TF ${report.examQuestions}) · glossary ${report.glossary}`);
console.log('  questions by module    ', JSON.stringify(report.questionsByModule));
console.log('  questions by type      ', JSON.stringify(report.questionsByType));
console.log('  questions by difficulty', JSON.stringify(report.questionsByDifficulty));
console.log('  lessons by module      ', JSON.stringify(report.lessonsByModule));
if (coverage) console.log(`  review coverage (${coverage.file}): ${coverage.covered}/${coverage.total}`);
if (!STRICT) console.log('  (coverage gaps are warnings; run with --strict for the release check)');
const show = (label, list) => { if (!list.length) return; console.log(`\n${label} (${list.length}):`); for (const m of list.slice(0, 200)) console.log('  - ' + m); if (list.length > 200) console.log(`  … ${list.length - 200} more`); };
show('WARNINGS', warnings);
show('ERRORS', errors);
console.log(errors.length ? `\n✗ ${errors.length} error(s)` : '\n✓ no errors');
process.exit(errors.length ? 1 : 0);
