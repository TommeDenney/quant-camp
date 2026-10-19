# Build status

_Maintained by the QA agent. Last updated: 2026-10-19 (evening)._

## Current milestone
Phase 2 – functional foundation (app shell + first content), with the QA harness in place.

## Completed
- Statistics library `src/lib/stats.ts` (moments, quantiles, normal/t/F/gamma/χ², tests, resampling, ACF, AR(1), OLS, trends, periodogram, aliasing) with SciPy-verified unit tests
- Mastery / spaced-review engine `src/lib/mastery.ts` and planner `src/lib/plan.ts`
- Scoring helpers `src/lib/score.ts` (every question type, mock summary, readiness)
- Content validator `scripts/validate-content.mjs` (`npm run validate`, `npm run validate:strict`)
- Question verifier `scripts/verify-questions.py` (recomputes `check.py` expressions with NumPy/SciPy)
- Playwright config (production build, system Chrome, laptop 1470×956 + mobile 390×844)

## Curriculum coverage (from the validator)
| | count |
|---|---|
| modules with lessons | 3 / 14 (0–2) |
| lessons | 9 |
| objectives | 16 |
| questions | 46 (31 exam-eligible MC/TF) |
| glossary terms | 0 |
| source-map topics covered | 15 / 93 (modules 0–2 fully covered except review-checklist pointers) |

## Tests
| suite | result |
|---|---|
| unit (Vitest) | 60 / 60 passing (stats, mastery, planner, scoring, slide-formula moments, all 15 visualizations render + respond + reset in jsdom) |
| content validation | passing (13 coverage warnings: modules 1–13 have no lessons yet) |
| verify-questions | 10 / 10 computational checks pass; 4 numeric without `check` (m0-q05, m0-q07, m0-q12, m1-q16) hand-verified correct (46, 53, 3.5, 6.25) |
| build | ✗ blocked: `src/App.tsx` is still the Vite template and imports deleted `src/assets/*` (builder is replacing it) |
| e2e (Playwright) | not yet run (waiting for app routes) |

## Known bugs
- **HIGH – answers leak through position.** `src/components/QuestionCard.tsx:36` shuffles only `order`/`match` items; `mc` and `multi` choices render in stored order, and the correct answer is choice index 1 in 23/29 multiple-choice questions (validator warning). Fix: display mc/multi choices in `seededOrder(choices.length, q.id)` order (keep `tf` as True/False, and keep "All/None of the above"-style options last), mapping the clicked display index back to the stored index before `scoreAnswer`. Alternatively the content can vary answer positions, but shuffling in the UI also stops mock exams rewarding memorised positions.
- Review-checklist entries in `curriculum/source-map-draft.json` (file `review`, e.g. pages 4, 9–11) count as uncovered because lessons cite lecture slides, not the review pages. Add the matching `src('review', n)` reference to each lesson's `sources` so coverage is traceable to the checklist.
- `src/lib/plan.ts:61` – the prerequisite condition for choosing the next lesson ends in `|| true`, so prerequisites never hold a lesson back. Lessons are still offered in study order, so this is harmless today, but the "never introduce an unexplained prerequisite" rule is not enforced by the planner.

## Fixed by QA
- `src/data.ts:15` – content exports were only collected when named `LESSONS*`/`QUESTIONS*`/…; `src/content/m0.ts` exports `lessons`/`questions`/`objectives`, so the app loaded no content. Prefix match is now case-insensitive; the validator now errors on exports the app can't see.
- `vite.config.ts:1` – `test` config key failed type-checking (`tsc -b`); added `/// <reference types="vitest/config" />`.

## Unfinished
- App routes, pages and the 15 visualizations (builder)
- Modules 1–13 content, glossary, Python Lab examples, reference (lead)
- `curriculum/source-map.json`
- E2E suite run

## Next task
Write the Playwright suite against the builder's routes once they land; keep the loop running.
