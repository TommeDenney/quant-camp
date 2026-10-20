// The app shell: sidebar (desktop) or bottom navigation (phones), and a top bar with
// search, the focus timer, the star counter and the theme switch.
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { hoursLeft, useProgress } from '../store/progress';
import { Icon, type IconName } from './Icon';
import { SearchBox } from './Search';
import { FocusTimer } from './Timer';
import { THEMES, type Theme } from '../lib/themes';

const NAV: { to: string; label: string; icon: IconName; mobile?: boolean }[] = [
  { to: '/', label: 'Mission Control', icon: 'home', mobile: true },
  { to: '/learn', label: 'Learn', icon: 'learn', mobile: true },
  { to: '/practice', label: 'Practice', icon: 'practice', mobile: true },
  { to: '/mock', label: 'Mock exam', icon: 'mock', mobile: true },
  { to: '/reference', label: 'Reference', icon: 'reference', mobile: true },
  { to: '/findit', label: 'Find it in your notes', icon: 'target' },
  { to: '/labs', label: 'Simulators', icon: 'labs' },
  { to: '/python', label: 'Python Lab', icon: 'python' },
  { to: '/glossary', label: 'Glossary', icon: 'glossary' },
  { to: '/notes', label: 'Notes & bookmarks', icon: 'notes' },
];

function Countdown() {
  const setup = useProgress((s) => s.setup);
  const h = hoursLeft(setup);
  const d = Math.floor(h / 24), hh = Math.floor(h % 24);
  return <div className="text-xs text-muted px-3">{h <= 0 ? 'Exam time has passed' : <>Exam in <b style={{ color: 'var(--ink)' }}>{d ? `${d}d ` : ''}{hh}h {Math.floor((h * 60) % 60)}m</b></>}</div>;
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme, setTheme, stars } = useProgress();
  const loc = useLocation();
  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="flex items-center gap-2.5 px-3 pb-4 pt-1">
          <span className="w-9 h-9 rounded-xl grid place-items-center font-black text-lg" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Σ</span>
          <div><div className="font-extrabold leading-tight">Quant Camp</div><div className="text-xs text-muted">Quiz 1 boot camp</div></div>
        </div>
        <nav className="grid gap-0.5" aria-label="Main navigation">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'} className="nav-link"><Icon name={n.icon} />{n.label}</NavLink>)}
        </nav>
        <div className="mt-auto grid gap-3 pt-6">
          <Countdown />
          <p className="text-[11px] text-muted px-3 leading-snug">Built from the course slides for study. Progress is saved only in this browser.</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar no-print">
          <SearchBox />
          <div className="ml-auto flex items-center gap-2">
            <FocusTimer />
            <span className="chip chip-warn font-bold tabular-nums" title="Stars earned" aria-label={`${stars} stars`}><Icon name="star" size={14} />{stars}</span>
            <label className="theme-picker">
              <span className="sr-only">Study theme</span>
              <span aria-hidden="true" className="theme-swatch" style={{ background: THEMES.find((t) => t.id === theme)?.color }} />
              <select aria-label="Study theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
        </header>
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={loc.pathname} className="page" id="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
      <nav className="bottom-nav no-print" aria-label="Main navigation">
        {NAV.filter((n) => n.mobile).map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}><Icon name={n.icon} />{n.label.replace('Mission Control', 'Home').replace('Mock exam', 'Mock')}</NavLink>)}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="grid gap-1 min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="text-2xl md:text-[1.7rem] font-extrabold tracking-tight">{title}</h1>
        {children && <div className="text-muted max-w-2xl">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="card card-pad text-center grid gap-2 py-10"><b>{title}</b>{children && <div className="text-sm text-muted">{children}</div>}</div>;
}
