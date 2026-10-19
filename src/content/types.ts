// Content model. Lessons and questions are plain data so they can be validated,
// mapped to the source slides and loaded independently.

/** Where something comes from in the course files, e.g. { file: 'L03-04', pages: [12, 13] }. */
export interface SourceRef {
  file: 'review' | 'L01-02' | 'L03-04' | 'L05-06' | 'L07-08' | 'L09-10';
  pages: number[];
  note?: string;
}

/** How a piece of content relates to the slides. */
export type Provenance = 'slides' | 'explanation' | 'clarification';

export interface Objective {
  id: string; // e.g. 'm3.pvalue'
  module: number;
  title: string;
  prereqs: string[];
  /** 1 (core, on the review checklist) … 3 (supporting). */
  priority: 1 | 2 | 3;
  sources: SourceRef[];
}

export type Block =
  | { kind: 'text'; md: string; provenance?: Provenance }
  | { kind: 'math'; tex: string; caption?: string }
  | { kind: 'callout'; tone: 'tip' | 'warning' | 'professor' | 'erratum'; md: string }
  | { kind: 'viz'; id: VizId; preset?: string; caption?: string }
  | { kind: 'predict'; prompt: string; options: string[]; answer: number; reveal: string; viz?: VizId }
  | { kind: 'steps'; title: string; steps: { md: string; tex?: string }[] }
  | { kind: 'code'; title: string; code: string; explain: string[]; output?: string }
  | { kind: 'derivation'; title: string; md: string };

export type VizId =
  | 'distribution' | 'moments' | 'pdfcdf' | 'bayes' | 'tails' | 'testpicker' | 'permutation' | 'bootstrap'
  | 'acf' | 'ar1' | 'filtering' | 'spectral' | 'regression' | 'crossval' | 'attribution';

/** The ten-step lesson structure. Each step is a list of blocks. */
export interface Lesson {
  id: string; // e.g. 'm3-l1'
  module: number;
  title: string;
  minutes: number;
  objectives: string[];
  sources: SourceRef[];
  why: Block[]; // 1. why this matters
  prereq: Block[]; // 2. essential prerequisite
  plain: Block[]; // 3. plain-English explanation
  visual: Block[]; // 4. visual explanation
  worked: Block[]; // 5. worked example
  interact: Block[]; // 6. student interaction
  check: string[]; // 7. mini knowledge check (question ids)
  // 8. mistakes are explained per question (explanations + remediation)
  takeaway: string; // 9. key takeaway
  // 10. recall is scheduled automatically from the objectives
}

export type QType = 'mc' | 'multi' | 'tf' | 'numeric' | 'order' | 'match';
export interface Question {
  id: string;
  type: QType;
  module: number;
  topic: string;
  subtopic: string;
  objective: string;
  difficulty: 1 | 2 | 3;
  prompt: string; // Markdown + $math$
  /** Choices for mc / multi / tf / order (in correct order for 'order') / match (left|right). */
  choices?: string[];
  /** mc / tf: index; multi: indexes; numeric: value; order: identity; match: right-index per left. */
  answer: number | number[];
  tolerance?: number; // numeric
  explanation: string;
  /** Why each wrong choice is tempting / wrong, by choice index. */
  distractors?: Record<number, string>;
  source: SourceRef[];
  prereqs: string[];
  misconceptions?: string[];
  /** Questions marked exam:false are for learning only (not in the multiple-choice mock exams). */
  exam?: boolean;
  /** An optional figure: a viz preset frozen for interpretation questions. */
  figure?: { viz: VizId; preset: string };
  /** Optional Python (numpy/scipy) expression whose value must equal the answer; checked by scripts/verify-questions.py. */
  check?: { py: string };
}

export interface Module {
  id: number;
  title: string;
  day: 'mon' | 'tue' | 'wed';
  blurb: string;
  lessons: string[];
}
