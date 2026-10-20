// Bookmarked lessons, lesson notes (exportable as Markdown) and the glossary.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cite, download } from '../components/Bits';
import { Icon } from '../components/Icon';
import { Empty, PageHeader } from '../components/Layout';
import { Md } from '../components/Md';
import { GLOSSARY, LESSONS, lessonById } from '../data';
import { lessonsNotebook } from '../lib/lessonNotes';
import { useProgress } from '../store/progress';

export function Notes() {
  const { bookmarks, notes, setNote, toggleBookmark, lessons: prog } = useProgress();
  const withNotes = Object.entries(notes).filter(([, t]) => t.trim());
  const exportMd = () => download('quant-camp-notes.md', `# Quant Camp notes\n\n${withNotes.map(([id, t]) => `## ${lessonById(id)?.title || id}\n\n${t}\n`).join('\n')}`, 'text/markdown');
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Notes & bookmarks" title="Your notes" actions={withNotes.length > 0 && <button className="btn" onClick={exportMd}><Icon name="download" size={16} />Export notes (.md)</button>}>Saved in this browser only. Export them if you want a copy.</PageHeader>
      <section className="card card-pad grid gap-3" style={{ background: 'var(--accent-soft)' }}>
        <h2 className="font-bold">Put your notes in your Colab file</h2>
        <ol className="grid gap-1 text-sm list-decimal pl-5">
          <li>On any lesson, press <b>Copy for Colab</b>. In your Colab file, add a text cell (<b>+ Text</b>) and paste. You get the takeaway, the formulas (Colab shows the math), where to look in the slides and reference sheet, and your notes.</li>
          <li>For the lesson's Python, use the copy button on each code block and paste it into a code cell (<b>+ Code</b>).</li>
          <li>Or download everything at once below, open it in Colab (File &gt; Upload notebook), and copy the cells you want into your file (Edit &gt; Copy cell, then paste).</li>
        </ol>
        <p className="text-sm">Tip for the open-note exam: give each lesson a heading, and add a contents cell at the top of your file listing the topics, so you can jump to the right place fast.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary btn-sm" onClick={() => download('quant-camp-lesson-notes.ipynb', lessonsNotebook(LESSONS.filter((l) => prog[l.id] || notes[l.id]?.trim()), notes), 'application/x-ipynb+json')}><Icon name="download" size={16} />Download lessons I've studied</button>
          <button className="btn btn-sm" onClick={() => download('quant-camp-all-lessons.ipynb', lessonsNotebook(LESSONS, notes), 'application/x-ipynb+json')}><Icon name="download" size={16} />Download all {LESSONS.length} lessons</button>
        </div>
      </section>
      <section className="grid gap-3">
        <h2 className="font-bold">Bookmarked lessons</h2>
        {bookmarks.length === 0 ? <p className="text-sm text-muted">Use the bookmark button on any lesson to keep it here.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">{bookmarks.map((id) => { const l = lessonById(id); return l ? (
            <li key={id} className="card card-pad flex items-center gap-2"><Link to={`/learn/${id}`} className="flex-1 font-semibold">{l.title}</Link><button className="btn btn-sm btn-ghost" aria-label="Remove bookmark" onClick={() => toggleBookmark(id)}><Icon name="x" size={14} /></button></li>) : null; })}</ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="font-bold">Lesson notes</h2>
        {withNotes.length === 0 ? <p className="text-sm text-muted">Open the Notes panel in any lesson to write here.</p> : withNotes.map(([id, t]) => (
          <label key={id} className="card card-pad field"><span><Link className="underline" to={`/learn/${id}`}>{lessonById(id)?.title || id}</Link></span>
            <textarea className="input min-h-[90px]" value={t} onChange={(e) => setNote(id, e.target.value)} /></label>
        ))}
      </section>
    </div>
  );
}

export function Glossary() {
  const [q, setQ] = useState('');
  const t = q.toLowerCase();
  const list = GLOSSARY.filter((g) => !t || g.term.toLowerCase().includes(t) || g.short.toLowerCase().includes(t) || (g.aliases || []).some((a) => a.toLowerCase().includes(t)));
  const letters = [...new Set(list.map((g) => g.term[0].toUpperCase()))];
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Glossary" title="Key terms">Every term is linked to where it appears in the slides.</PageHeader>
      {GLOSSARY.length === 0 ? <Empty title="The glossary is being prepared" /> : (
        <>
          <input className="input max-w-md" placeholder="Filter terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter terms" />
          {letters.map((L) => (
            <section key={L} className="grid gap-2">
              <h2 className="eyebrow">{L}</h2>
              <dl className="grid gap-3 md:grid-cols-2">
                {list.filter((g) => g.term[0].toUpperCase() === L).map((g) => (
                  <div key={g.term} id={encodeURIComponent(g.term)} className="card card-pad grid gap-1.5 scroll-mt-24 content-start">
                    <dt className="font-bold">{g.term}{g.aliases?.length ? <span className="text-xs text-muted font-normal"> · {g.aliases.join(', ')}</span> : null}</dt>
                    <dd className="grid gap-1.5"><Md>{g.short}</Md>{g.md && <Md className="text-sm">{g.md}</Md>}<Cite sources={g.sources || (g.source ? [g.source] : [])} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {list.length === 0 && <p className="text-sm text-muted">No terms match “{q}”.</p>}
        </>
      )}
    </div>
  );
}
