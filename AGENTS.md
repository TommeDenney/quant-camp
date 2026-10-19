# Quant Camp: handoff for the next agent

Exam boot-camp web app for Divine (stats + time series exam, **Wed 2026-10-21 13:10**).
Studies on a MacBook Air M2 15" with a paper notebook. Deploy target: https://tommedenney.github.io/quant-camp/ (GitHub repo `TommeDenney/quant-camp`, not created yet).

## Stack
Vite 8, React 19, TypeScript, Tailwind v4, KaTeX, zustand (persist key `quant-camp.v1`), framer-motion, canvas-confetti, Vitest, Playwright (system Chrome). HashRouter, base `/quant-camp/`.
Scripts: `npm run dev | build | preview | test | validate | e2e | extract`. Deploy workflow: `.github/workflows/deploy.yml` (test, validate, build, Pages).

## Hard rules
- The professor's source files (`source_materials/*`, `curriculum/extracted/`) are gitignored. Never commit them or paste them into the repo.
- No AI at runtime. No emoji anywhere. The Md renderer does NOT support markdown tables.
- Every numeric answer must be verified with numpy/scipy (add `check: { py }` on the question). Never trust remembered values.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or your own attribution).

## Done
- Libraries: `src/lib/stats.ts`, `mastery.ts`, `plan.ts`, with unit tests (passing).
- Store: `src/store/progress.ts`. Set `DEFAULT_EXAM` to `'2026-10-21T13:10'` if it is still 10:00.
- UI: `src/components/*`, `src/pages/*` (Dashboard, Learn, LessonPlayer, Practice, Quiz, Mock, Reference, Notes, Labs, PythonLab, Onboarding). The builder was stopped partway through "quiz session and mock exam", so check that Quiz.tsx and Mock.tsx are complete.
- All 15 visualizations in `src/viz/` plus the registry `src/viz/index.tsx`.
- `public/sw.js` and the manifest are in place (offline). Tests are in `tests/unit` and `tests/e2e`; mobile tests are tagged `@mobile`.
- Content (`src/content/`): m0 (12 questions), m1 (17), m2 (17), m3 (22), m4 (22). m3 and m4 were written by an agent that was stopped before the end, so review them for completeness.
- Typecheck (`npx tsc --noEmit -p .`) passed at handoff.
- Reader notes: `curriculum/notes/L01-04.md`, `L05-06.md`, `L07-08.md`, `L09-10.md`, `curriculum/source-map-draft.json`.

## To do (in priority order)
1. Content for **m5** (Permutation & Bootstrap) through **m12**, plus **m13** (Final Integrated Practice, 30+ mixed questions). Module titles are in `src/content/modules.ts`. Follow `m2.ts` exactly for the shape: 10-step lessons, then questions. Ground everything in `curriculum/notes/*.md` and cite with `src()`.
   - Include the F-test corrigendum (L07-08 p.5): the slide is wrong; the corrected F = 1.2593, p ≈ 0.029. Put it in an `erratum` callout.
2. Content index `src/content/index.ts`: gather all objectives, lessons and questions; fill `MODULES[].lessons`; wire glossary, `reference.ts` (REFERENCE) and `python.ts` (PY_EXAMPLES). Check `src/data.ts` for what the pages import.
3. Reach **250+ questions** in total. Run `npm run validate`, `npm test`, `npm run build` and `npm run e2e`, and fix failures.
4. Create the public repo `TommeDenney/quant-camp`, push to main, enable Pages (GitHub Actions), and verify the live URL.
5. Write README.md and BUILD_STATUS.md.

Python for verification: a venv with numpy/scipy/statsmodels/pandas existed in a temporary scratchpad. If it is gone, recreate it with `python3 -m venv .venv && .venv/bin/pip install numpy scipy statsmodels pandas` (`.venv` must be gitignored).
