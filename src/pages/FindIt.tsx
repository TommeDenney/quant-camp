// Find-it drill. The exam is open-note, so the key skill is recognising which notes
// solve a problem. Each round shows an exam question; you pick the lecture and the
// reference-sheet section you would open, then see exactly where the answer lives.
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { Md } from '../components/Md';
import { celebrate } from '../components/Reward';
import { WhereToLook } from '../components/WhereToLook';
import type { Question } from '../content/types';
import { REFERENCE } from '../content/reference';
import { FILE_NAMES, lessonForObjective, QUESTIONS } from '../data';
import { lectureFiles, LECTURES, refForModule } from '../lib/notes';
import { pick } from '../lib/select';
import { useProgress } from '../store/progress';

const ROUND = 10;

function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

function Round({ q, onDone }: { q: Question; onDone: (points: number) => void }) {
  const files = lectureFiles(q);
  const ref = refForModule(q.module)!;
  const refChoices = useMemo(() => shuffle([ref, ...shuffle(REFERENCE.filter((r) => r.id !== ref.id)).slice(0, 3)]), [q.id]);
  const [lecture, setLecture] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const lectureOk = lecture != null && files.includes(lecture as Question['source'][number]['file']);
  const sectionOk = section === ref.id;
  const lesson = lessonForObjective(q.objective);
  const choice = (label: string, picked: boolean, right: boolean, done: boolean, onClick: () => void) => (
    <button key={label} disabled={done} onClick={onClick} className="choice text-left rounded-xl px-3 py-2 font-semibold"
      style={{ border: '1.5px solid', borderColor: done && right ? 'var(--good)' : done && picked ? 'var(--bad)' : 'var(--line)', background: done && right ? 'color-mix(in srgb, var(--good) 12%, transparent)' : undefined }}>
      {label}
    </button>
  );
  return (
    <div className="grid gap-4">
      <div className="card card-pad grid gap-2">
        <div className="eyebrow">The problem (don't solve it yet)</div>
        <Md>{q.prompt}</Md>
      </div>
      <div className="grid gap-2">
        <b>1. Which lecture would you open?</b>
        <div className="grid gap-2 sm:grid-cols-5">{LECTURES.map((f) => choice(FILE_NAMES[f], lecture === f, files.includes(f), lecture != null, () => setLecture(f)))}</div>
      </div>
      {lecture != null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2">
          <b>2. Which reference-sheet section has the tool you need?</b>
          <div className="grid gap-2 sm:grid-cols-2">{refChoices.map((r) => choice(r.title, section === r.id, r.id === ref.id, section != null, () => setSection(r.id)))}</div>
        </motion.div>
      )}
      {section != null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 grid gap-3 ${lectureOk && sectionOk ? 'feedback-good' : 'feedback-bad'}`}>
          <div className="flex items-center gap-2 font-bold"><Icon name={lectureOk && sectionOk ? 'check' : 'x'} />{lectureOk && sectionOk ? 'Found it.' : lectureOk || sectionOk ? 'Half right.' : 'Not quite.'}</div>
          <WhereToLook q={q} />
          {lesson && <div className="text-sm"><b>The idea to look for:</b> <Md>{lesson.takeaway}</Md></div>}
          <div className="flex flex-wrap gap-2">
            <Link to={`/quiz?obj=${encodeURIComponent(q.objective)}&n=3`} className="btn btn-sm">Solve questions like this</Link>
            <button className="btn btn-primary" autoFocus onClick={() => onDone(Number(lectureOk) + Number(sectionOk))}>Next problem <Icon name="arrow" size={16} /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function FindIt() {
  const { seen, addStars } = useProgress();
  const pool = useMemo(() => QUESTIONS.filter((q) => q.module <= 12 && q.exam !== false && lectureFiles(q)[0] !== 'review' && refForModule(q.module)), []);
  const [set, setSet] = useState(() => pick(pool, ROUND, seen));
  const [i, setI] = useState(0);
  const [points, setPoints] = useState(0);
  const restart = () => { setSet(pick(pool, ROUND, seen)); setI(0); setPoints(0); };
  const finished = i >= set.length;
  return (
    <div className="grid gap-6 max-w-3xl">
      <PageHeader eyebrow="Open-note skill" title="Find it in your notes">
        Your exam is open-note, so the real skill is knowing where to look. For each problem, pick the lecture and the reference section you'd open. Speed comes from practice: aim for under 20 seconds a problem.
      </PageHeader>
      {finished ? (
        <div className="card card-pad grid gap-3 justify-items-start">
          <b className="text-xl">{points} of {set.length * 2} found</b>
          <p className="text-muted">Add any you missed to the index page in your notebook: topic, lecture, slide.</p>
          <button className="btn btn-primary" onClick={restart}>Another round</button>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted">Problem {i + 1} of {set.length} · {points} points</div>
          <AnimatePresence mode="wait">
            <motion.div key={set[i].id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <Round q={set[i]} onDone={(p) => {
                const total = points + p; setPoints(total);
                if (p === 2) addStars(1);
                if (i + 1 >= set.length) celebrate(total >= set.length * 1.6 ? 'big' : 'small');
                setI(i + 1);
              }} />
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
