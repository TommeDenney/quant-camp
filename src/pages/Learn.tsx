// The module and lesson list, grouped by study day.
import { Link } from 'react-router-dom';
import { Bar } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { LESSONS, MODULES, QUESTIONS } from '../data';
import { levelOf } from '../lib/mastery';
import { masteryOf, objectivesOfModule } from '../lib/summary';
import { useProgress } from '../store/progress';

const DAY = { mon: 'Monday · foundations and inference', tue: 'Tuesday · time series and modelling', wed: 'Wednesday · final practice' };

export default function Learn() {
  const { lessons: prog, objectives, bookmarks, toggleBookmark } = useProgress();
  if (!LESSONS.length && !MODULES.length) return <><PageHeader title="Learn" /><Empty title="No lessons yet">The lessons are being prepared.</Empty></>;
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Learn" title="Modules & lessons">Each lesson has ten short steps: why it matters, the prerequisite, a plain explanation, a visual, a worked example, something to try, a quick check, common mistakes, the takeaway and a recall plan.</PageHeader>
      {(['mon', 'tue', 'wed'] as const).map((day) => {
        const mods = MODULES.filter((m) => m.day === day);
        if (!mods.length) return null;
        return (
          <section key={day} className="grid gap-3">
            <h2 className="eyebrow">{DAY[day]}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mods.map((m) => {
                const ls = m.lessons.map((id) => LESSONS.find((l) => l.id === id)).filter((l) => !!l);
                const score = masteryOf(objectives, objectivesOfModule(m.id));
                const qn = QUESTIONS.filter((q) => q.module === m.id).length;
                return (
                  <article key={m.id} id={`m${m.id}`} className="card card-pad grid gap-3 content-start">
                    <header className="grid gap-1">
                      <div className="flex items-baseline justify-between gap-2"><h3 className="font-bold"><span className="text-muted">{m.id}.</span> {m.title}</h3><span className="text-xs text-muted whitespace-nowrap">{levelOf(score)}</span></div>
                      <p className="text-sm text-muted">{m.blurb}</p>
                      <Bar value={score} />
                    </header>
                    {ls.length === 0 ? <p className="text-sm text-muted">Lessons coming soon.</p> : (
                      <ul className="grid gap-1">
                        {ls.map((l) => {
                          const p = prog[l.id];
                          return (
                            <li key={l.id} className="flex items-center gap-2">
                              <Link to={`/learn/${l.id}`} className="flex-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--surface-2)] min-w-0">
                                <span className="w-5 h-5 rounded-full grid place-items-center flex-none" style={{ background: p?.done ? 'var(--good)' : p ? 'var(--accent-soft)' : 'var(--surface-2)', color: p?.done ? '#fff' : 'var(--accent)' }}>
                                  {p?.done ? <Icon name="check" size={12} /> : p ? <span className="text-[10px] font-bold">{p.step + 1}</span> : null}
                                </span>
                                <span className="truncate text-sm font-semibold">{l.title}</span>
                                <span className="ml-auto text-xs text-muted whitespace-nowrap">{l.minutes} min</span>
                              </Link>
                              <button className="btn btn-sm btn-ghost" aria-label={bookmarks.includes(l.id) ? 'Remove bookmark' : 'Bookmark'} aria-pressed={bookmarks.includes(l.id)} onClick={() => toggleBookmark(l.id)} style={{ color: bookmarks.includes(l.id) ? 'var(--warn)' : 'var(--muted)' }}>
                                <Icon name="bookmark" size={15} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {qn > 0 && <Link to={`/quiz?module=${m.id}&n=10`} className="btn btn-sm justify-self-start">Module assessment · 10 questions</Link>}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
