# Quant Camp

An adaptive, interactive study boot camp for **Advanced Quantitative Methods for Climate** (Quiz 1),
built as a static web app (React + TypeScript + Vite) and deployed to GitHub Pages.

It teaches from first principles in short guided lessons (why it matters → prerequisite →
plain-English explanation → interactive visual → worked example → your turn → mini check →
feedback → key takeaway → spaced recall), tracks mastery per learning objective, schedules
spaced review, and ends with multiple-choice mock exams and an offline open-note reference.

- No account, no server, no AI at runtime. Progress is saved in this browser (localStorage).
- Works offline after the first visit (service worker), on laptop and phone.
- The reference section is printable. **Check with the instructor before using any part of
  this app during the quiz** (the course allows open-book materials but not online browsing or AI).

## Using it

1. Open the site and answer the setup questions (hours available Monday/Tuesday, minutes on
   Wednesday, confidence in statistics and Python, exam time).
2. Press **Continue Studying** on the dashboard. It picks the next best thing: a due review,
   the next lesson in the plan, practice on a weak topic, or a mock exam.
3. Aim for 80% on two different cumulative mock exams, plus 80% on delayed review questions.

## Developing

```bash
npm install
npm run dev            # http://localhost:5173/quant-camp/
npm run build          # type-check + production build into dist/
npm run preview        # serve the production build at http://localhost:4173/quant-camp/
```

## Testing

```bash
npm run test             # unit tests (Vitest): statistics, mastery, planner, scoring
npm run validate         # content validator (structure, answers, sources, KaTeX, coverage)
npm run validate:strict  # release check: also fails on empty modules / untaught objectives
python3 scripts/verify-questions.py   # recompute computational questions with NumPy/SciPy
npm run build && npm run e2e          # Playwright end-to-end tests on the production build
```

`verify-questions.py` needs `numpy scipy statsmodels`. Playwright uses the installed Google
Chrome (no browser download) and serves `dist/` itself, so build first.

## Course sources

The six course files (`Review_Quiz1.pdf`, `Lecture01&02 (3).pdf`, `Lecture03&04 (2).pdf`,
`Lecture05&06_forupload.pptx`, `Lecture07&08 (2).pdf`, `Lecture09&10.pdf`) go in
`source_materials/`. They are **never committed** (see `.gitignore`).

```bash
pip install pymupdf python-pptx
npm run extract        # text + page images → curriculum/extracted/ (also not committed)
```

`curriculum/source-map.json` maps every lesson to the file and slide numbers it is built from.
In the app every lesson and question shows its source ("Lecture 3–4, slides 22–25"). Content is
labelled as taught on the slides, as an added explanation, or as a clarification; apparent
errors on slides are kept as taught, flagged, and explained.

## Content

All curriculum is plain TypeScript data in `src/content/`:

- `modules.ts`: the 14 modules and their study day
- `m0.ts`, `m1.ts`, …: objectives, lessons and questions per module. Export arrays whose names
  start with `OBJECTIVES`, `LESSONS`, `QUESTIONS` or `GLOSSARY` (any case); `src/data.ts`
  merges every file automatically.
- `python.ts`: Python Lab examples; `reference.ts`: the open-note reference

Every question needs a unique id, objective, difficulty, explanation and source. Computed
questions can carry `check: { py: "…" }` so `verify-questions.py` recomputes the answer.
Run `npm run validate` after editing.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`: unit tests, content validation, build,
then deployment to GitHub Pages (Settings → Pages → Source: GitHub Actions). The Vite base path
is `/quant-camp/`; change `base` in `vite.config.ts` if the repository is renamed.
