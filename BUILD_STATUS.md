# Build status

Updated 2026-10-19 by Codex after continuing the Claude handoff.

## Implemented

- All 14 modules: 35 guided lessons, 48 objectives, 253 questions; module 13 has 32 integrated questions.
- 85 sourced glossary entries and 13 printable reference sections.
- All 93 source-map topics point to teaching lessons. Added explicit explanations for periodic AR, AR(2), ARX, spectral band-pass interpretation and regression uncertainty.
- Preserved and explained the F-test correction (F=1.2593, two-sided p about 0.029), corrected AR forecast variance denominator, and other documented slide errata.
- Google Colab walkthrough, six executable tutorial cells, practice CSV, starter notebook and 13 standalone Python examples with displayed outputs and interpretation.
- Generated notebooks in public/notebooks/; build regenerates them from the app's content.
- Default warm cream light mode, with pale sage, mist blue, soft lavender and night options. Choice persists in browser storage.
- Shuffled MC/select-all options in practice and mocks with original-index scoring; fixed quiz and lesson state on route changes, prerequisite gating, unanswered mock remediation, and readiness requiring consecutive passes on distinct sets.
- Keyboard fixes for question actions and line-by-line code explanations; laptop/mobile Colab and theme browser regressions added.
- CI configured to run strict validation, question and example computations, production build and browser tests before Pages deployment.

## Verification in this session

The repository's npm dependencies could not be installed: terminal network access is disabled,
and the offline npm cache is incomplete. This means the standard build, full unit suite,
KaTeX rendering validation and Playwright suite have **not passed in this checkout**.
The machine's Node 22.20 is also below the minimum required by some locked test dependencies;
the package now documents its compatible Node versions.

Available local tools were used without changing the repository's dependency versions:

- 56 pure unit tests passed with an existing Vitest 2.1.9 installation (statistics, mastery, planner, scoring, selection and notebook export). Visualization/jsdom tests were not run.
- Strict structural content validation passed with real Rolldown: 253 questions, 35 lessons, 48 objectives, 85 glossary entries, 93/93 mapped source topics, zero errors or warnings. **KaTeX checks were explicitly skipped** because KaTeX is unavailable.
- NumPy/SciPy computations: 70 checks passed; all 69 numeric questions have check.py; none remain unverified.
- All 13 Python example cells and six executable Colab tutorial cells passed their displayed-output checks. The Colab file-upload API was simulated with the actual downloadable CSV; its live UI was not tested.
- An installed TypeScript 5.9.3 checked the content and pure-library subset without errors. The locked TypeScript 7 production build remains untested.
- An installed esbuild parsed/bundled the application with package dependencies externalized. This checks source syntax, not runtime behavior or production compatibility.
- Theme contrast checks passed for body text, muted text, buttons and feedback text/background pairs in all four pale palettes and night mode (all checked ratios at least 4.5:1).
- Generated notebook structure and cell IDs passed unit checks; git diff --check passed.

Fallback tool configuration, cached Python packages and reports are under ignored
node_modules/.cache/. They are session evidence, not application dependencies.

## Remaining release checks

On a network-enabled environment with a compatible Node release:

```bash
npm ci
python -m pip install numpy scipy pandas matplotlib statsmodels
npm test
npm run verify
npm run verify:examples
npm run validate:strict
npm run build
npm run e2e
```

Local browser tests use installed Chrome; PW_CHROME can point to another compatible
Chrome executable. CI installs Chromium and uses it automatically.

Review browser rendering, notebook downloads, quiz/mocks and the offline journey after
the full build. No Pages deployment or live-site verification has been performed from
this restricted session. The existing GitHub repository is cloned locally; these changes
are local until committed and pushed.
