#!/usr/bin/env node
// Export the question bank (and objectives) to JSON for scripts/verify-questions.py.
import { writeFileSync } from 'node:fs';
import { loadContent } from './load-content.mjs';

const out = process.argv[2] || 'node_modules/.cache/qc-questions.json';
const { questions, objectives } = await loadContent();
writeFileSync(out, JSON.stringify({ questions, objectives }, null, 1));
console.log(`exported ${questions.length} questions → ${out}`);
