// Search across lessons, the glossary and the formula reference. ⌘K / Ctrl+K or "/" focuses it.
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REFERENCE } from '../content/reference';
import { GLOSSARY, LESSONS, moduleById } from '../data';
import { Icon } from './Icon';

interface Hit { kind: 'Lesson' | 'Glossary' | 'Formula'; title: string; sub: string; to: string; text: string }

const strip = (s: string) => s.replace(/\$[^$]*\$/g, ' ').replace(/[*_`#[\]]/g, '').replace(/\s+/g, ' ');
const blockText = (bs: { kind: string; md?: string; prompt?: string; title?: string }[]) => bs.map((b) => b.md || b.prompt || b.title || '').join(' ');

export function buildIndex(): Hit[] {
  const out: Hit[] = [];
  for (const l of LESSONS) out.push({ kind: 'Lesson', title: l.title, sub: moduleById(l.module)?.title || `Module ${l.module}`, to: `/learn/${l.id}`, text: strip(`${l.title} ${l.takeaway} ${blockText([...l.why, ...l.plain])}`).toLowerCase() });
  for (const g of GLOSSARY) out.push({ kind: 'Glossary', title: g.term, sub: strip(g.short), to: `/glossary#${encodeURIComponent(g.term)}`, text: strip(`${g.term} ${(g.aliases || []).join(' ')} ${g.short}`).toLowerCase() });
  for (const s of REFERENCE) for (const it of s.items) out.push({ kind: 'Formula', title: it.term, sub: s.title, to: `/reference#${s.id}`, text: strip(`${it.term} ${s.title} ${it.md}`).toLowerCase() });
  return out;
}

export function SearchBox() {
  const idx = useMemo(buildIndex, []);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName || '');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hits = terms.length ? idx.map((h) => ({ h, s: terms.every((t) => h.text.includes(t)) ? (h.title.toLowerCase().includes(terms[0]) ? 2 : 1) + (h.kind === 'Lesson' ? 0.2 : 0) : 0 }))
    .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map((x) => x.h) : [];
  const go = (h: Hit) => { nav(h.to); setOpen(false); setQ(''); input.current?.blur(); };
  return (
    <div className="relative flex-1 max-w-md">
      <label className="relative block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" size={16} /></span>
        <input ref={input} className="input w-full pl-9 py-2 text-sm" placeholder="Search lessons, terms, formulas…" value={q} aria-label="Search"
          onChange={(e) => { setQ(e.target.value); setOpen(true); setSel(0); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
            if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
          }} />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline">⌘K</kbd>
      </label>
      <AnimatePresence>
        {open && terms.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 mt-2 w-full card p-1.5 grid gap-0.5 max-h-[60vh] overflow-y-auto" role="listbox">
            {hits.length === 0 && <li className="p-3 text-sm text-muted">No matches for “{q}”.</li>}
            {hits.map((h, i) => (
              <li key={h.kind + h.to + h.title} role="option" aria-selected={i === sel}>
                <button className="w-full text-left rounded-lg px-3 py-2 grid" style={i === sel ? { background: 'var(--accent-soft)' } : undefined} onMouseDown={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}>
                  <span className="text-sm font-semibold">{h.title} <span className="chip ml-1">{h.kind}</span></span>
                  <span className="text-xs text-muted truncate">{h.sub}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
