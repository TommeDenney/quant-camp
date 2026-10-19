// The open-note reference: formulas, the which-test table and key terms, laid out to print.
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { MathBlock, Md, MdInline } from '../components/Md';
import { REFERENCE } from '../content/reference';
import { citeSource, GLOSSARY } from '../data';
import { TESTS } from '../viz/testpicker';

export default function Reference() {
  return (
    <div className="grid gap-6 reference">
      <PageHeader eyebrow="Open-note reference" title="Quiz 1 reference sheet" actions={<button className="btn btn-primary" onClick={() => window.print()}><Icon name="print" size={16} />Print / save as PDF</button>}>
        Formulas, which test to use, and the key terms, in one place.
      </PageHeader>

      <div className="callout callout-warning no-print">
        <div className="callout-title">Before you rely on this in the exam</div>
        Check with your instructor whether this sheet counts as allowed notes. The quiz doesn't allow online browsing, so <b>print it</b> (or save a PDF before the exam) rather than opening this website during the quiz.
      </div>
      <div className="print-only text-xs">Quant Camp · Quiz 1 reference · compiled from the course slides. Confirm with your instructor that it is allowed as notes.</div>

      {REFERENCE.length > 0 && (
        <nav className="flex flex-wrap gap-2 no-print" aria-label="Sections">
          {REFERENCE.map((s) => <a key={s.id} href={`#/reference#${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' }); }} className="chip">{s.title}</a>)}
          <a href="#/reference#tests" onClick={(e) => { e.preventDefault(); document.getElementById('tests')?.scrollIntoView({ behavior: 'smooth' }); }} className="chip">Which test?</a>
        </nav>
      )}

      {REFERENCE.length === 0 && <div className="card card-pad text-sm text-muted">The formula sections are being prepared. The test table and glossary below are ready.</div>}

      {REFERENCE.map((s) => (
        <section key={s.id} id={s.id} className="ref-section grid gap-3 scroll-mt-20">
          <h2 className="text-lg font-extrabold" style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 4 }}>{s.title}</h2>
          <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
            {s.items.map((it, i) => (
              <div key={i} className="ref-item card card-pad grid gap-1.5 content-start">
                <b>{it.term}</b>
                {it.tex && <MathBlock tex={it.tex} />}
                <Md className="text-sm">{it.md}</Md>
                {it.source && <div className="text-[11px] text-muted">{citeSource(it.source)}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section id="tests" className="ref-section grid gap-3 scroll-mt-20">
        <h2 className="text-lg font-extrabold" style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 4 }}>Which test?</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.values(TESTS).map((t) => (
            <div key={t.id} className="ref-item card card-pad grid gap-1 content-start text-sm">
              <b className="text-base">{t.name}</b>
              <div className="text-muted">{t.tests}</div>
              <MathBlock tex={`H_0:\\ ${t.h0}`} />
              <MathBlock tex={t.stat} />
              <div><b>Distribution:</b> {t.dist}</div>
              <div><b>Assumes:</b> {t.assume}</div>
              <code className="text-xs" style={{ color: 'var(--ink-2)' }}>{t.py}</code>
              {t.note && <div className="text-xs text-muted">{t.note}</div>}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted no-print">Practise choosing with the <Link className="underline" to="/labs/testpicker">Which Test? tool</Link>.</p>
      </section>

      {GLOSSARY.length > 0 && (
        <section id="terms" className="ref-section grid gap-3">
          <h2 className="text-lg font-extrabold" style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 4 }}>Key terms</h2>
          <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2 text-sm">
            {GLOSSARY.map((g) => <div key={g.term} className="ref-item"><dt className="font-bold inline">{g.term}: </dt><dd className="inline"><MdInline>{g.short}</MdInline></dd></div>)}
          </dl>
        </section>
      )}
    </div>
  );
}
