# Quant Camp

An adaptive, interactive study boot camp for **Advanced Quantitative Methods for Climate** (Quiz 1),
built as a static web app (React + TypeScript + Vite) for deployment to GitHub Pages.

It teaches from first principles in short guided lessons (why it matters → prerequisite →
plain-English explanation → interactive visual → worked example → your turn → mini check →
feedback → key takeaway → spaced recall), tracks mastery per learning objective, schedules
spaced review, and ends with multiple-choice mock exams and an offline open-note reference.

- No account, no server, no AI at runtime. Progress is saved in this browser (localStorage).
- Works offline after the first visit (service worker), on laptop and phone.
- Starts in warm cream light mode, with pale sage, mist blue, soft lavender and a night theme in the **Study theme** menu. Theme choice is saved with progress.
- The reference section is printable. **Check with the instructor before using any part of
  this app during the quiz** (the course allows open-book materials but not online browsing or AI).

## Using it

1. Open the site and answer the setup questions (hours available Monday/Tuesday, minutes on
   Wednesday, confidence in statistics and Python, exam time).
2. Press **Continue Studying** on the dashboard. It picks the next best thing: a due review,
   the next lesson in the plan, practice on a weak topic, or a mock exam.
3. Aim for 80% on two different cumulative mock exams, plus 80% on delayed review questions.

## Developing

Use Node **22.22.2+ within the 22 release line**, 24.15+, or a supported newer release (see `package.json` engines). Some locked test dependencies need a newer Node than 22.20.

```bash
npm ci
npm run dev            # http://localhost:5173/quant-camp/
npm run build          # type-check + production build into dist/
npm run preview        # serve the production build at http://localhost:4173/quant-camp/
```

## Testing

```bash
npm run test             # unit tests (Vitest): statistics, mastery, planner, scoring
npm run validate         # content validator (structure, answers, sources, KaTeX, coverage)
npm run validate:strict  # release check: also fails on empty modules / untaught objectives
npm run verify           # validate content and recompute numeric answers with NumPy/SciPy
npm run verify:examples  # execute the published Python and Colab example cells
npm run build && npm run e2e          # Playwright end-to-end tests on the production build
```

Question verification needs `numpy scipy`; checks using statsmodels also need that package.
Example verification needs `numpy scipy pandas matplotlib`. The runner finds `.venv`,
system Python, or the executable set by `QC_PYTHON`. Playwright uses installed Google
Chrome locally (`PW_CHROME` overrides its path), and bundled Chromium in CI. It serves
`dist/` itself, so build first. `BUILD_STATUS.md` distinguishes verified checks from
checks still blocked by the current environment.

## Google Colab for Divine

Open **Python Lab** for an eight-step walkthrough: create text and code cells, run in order,
edit inputs, import NumPy/SciPy, plot, upload a CSV, interpret a t-test, save and recover from
a runtime reset. Use the existing Colab notebook; no local Python installation is needed
for studying in Colab.

The guide includes a practice CSV and a starter notebook. Thirteen self-contained course
examples cover descriptive statistics, tails, Welch and corrected F-tests, permutation,
bootstrap, effective sample size, AR forecasts, anomalies, spectra, regression, chronological
validation, and detection/attribution. Each includes expected output, assumptions and interpretation.

- [Colab starter notebook](public/notebooks/quant-camp-colab-starter.ipynb)
- [Course example notebook](public/notebooks/quant-camp-examples.ipynb)
- [Practice CSV](public/notebooks/quant-camp-practice.csv)

In Colab, choose **File → Upload notebook** for an `.ipynb` file. Upload the CSV only when
the starter notebook asks for data. Runtime variables and uploaded data can disappear
after a reset; rerun imports and definitions, and upload data again. Guidance follows the
[official Colab FAQ](https://research.google.com/colaboratory/faq.html).

`npm run notebooks` regenerates these files from the same content used by the app.
The build runs this export automatically. Quant Camp does not execute Python in the browser.

## Course sources

The six course files (`Review_Quiz1.pdf`, `Lecture01&02 (3).pdf`, `Lecture03&04 (2).pdf`,
`Lecture05&06_forupload.pptx`, `Lecture07&08 (2).pdf`, `Lecture09&10.pdf`) go in
`source_materials/`. They are **never committed** (see `.gitignore`).

```bash
pip install pymupdf python-pptx
npm run extract        # text + page images → curriculum/extracted/ (also not committed)
```

`curriculum/source-map.json` maps 93 course topics to teaching lessons; each lesson's
`sources` lists the files and slide numbers it is built from.
In the app every lesson and question shows its source ("Lecture 3–4, slides 22–25"). Content is
labelled as taught on the slides, as an added explanation, or as a clarification; apparent
errors on slides are kept as taught, flagged, and explained.

## Content

The curriculum contains **253 questions, 35 guided lessons, 48 objectives, 85 glossary
entries and 13 reference sections** across all fourteen modules. The final integrated
module contributes 32 mixed questions. `curriculum/source-map.json` links all 93 source
topics to teaching lessons. Source coverage indicates a teaching location, not exam-score certainty.

All curriculum is plain TypeScript data in `src/content/`:

- `modules.ts`: the 14 modules and their study day
- `m0.ts`, `m1.ts`, …: objectives, lessons and questions per module. Export arrays whose names
  start with `OBJECTIVES`, `LESSONS`, `QUESTIONS` or `GLOSSARY` (any case); `src/data.ts`
  merges every file automatically.
- `python.ts`: Python Lab examples; `reference.ts`: the open-note reference

Every question needs a unique id, objective, difficulty, explanation and source. Numeric
questions must carry `check: { py: "…" }` so `verify-questions.py` recomputes the answer;
computational multiple-choice questions can use the same mechanism.
Run `npm run validate` after editing.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: unit tests, strict content validation,
NumPy/SciPy question verification, Python example execution, build, Chromium browser tests,
then deployment to GitHub Pages (Settings → Pages → Source: GitHub Actions). The Vite base path
is `/quant-camp/`; change `base` in `vite.config.ts` if the repository is renamed.
