// First-run setup: time available each day, confidence, and the exam time.
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { celebrate } from '../components/Reward';
import { DEFAULT_EXAM, useProgress, type Setup } from '../store/progress';

function Scale({ label, value, onChange, low, high }: { label: string; value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold mb-1">{label}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)} className={`choice justify-center !w-12 font-bold${value === n ? ' selected' : ''}`}>{n}</button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted max-w-[300px]"><span>{low}</span><span>{high}</span></div>
    </fieldset>
  );
}

export default function Onboarding() {
  const { setup, saveSetup, reducedMotion, setReducedMotion } = useProgress();
  const [s, setS] = useState<Setup>({ ...setup, examAt: setup.examAt || DEFAULT_EXAM });
  const nav = useNavigate();
  const set = <K extends keyof Setup>(k: K, v: Setup[K]) => setS({ ...s, [k]: v });
  const num = (k: 'hoursMon' | 'hoursTue' | 'minutesWed', max: number) => (e: { target: { value: string } }) => set(k, Math.max(0, Math.min(max, +e.target.value || 0)));
  const save = () => { const first = !setup.done; saveSetup({ ...s, done: true }); if (first) celebrate('small'); nav('/'); };
  return (
    <motion.div className="max-w-2xl mx-auto grid gap-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid gap-2">
        <div className="eyebrow">Quant Camp · setup</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Let's plan your boot camp</h1>
        <p className="text-muted">Three questions, and the camp builds a plan that fits the time you actually have before Quiz 1. You can change these later.</p>
      </div>
      <section className="card card-pad grid gap-5">
        <h2 className="font-bold">How much time do you have?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field"><span>Monday (hours)</span><input className="input" type="number" min={0} max={14} step={0.5} value={s.hoursMon} onChange={num('hoursMon', 14)} /></label>
          <label className="field"><span>Tuesday (hours)</span><input className="input" type="number" min={0} max={14} step={0.5} value={s.hoursTue} onChange={num('hoursTue', 14)} /></label>
          <label className="field"><span>Wednesday review (minutes)</span><input className="input" type="number" min={0} max={300} step={5} value={s.minutesWed} onChange={num('minutesWed', 300)} /></label>
        </div>
        <label className="field max-w-xs"><span>Exam start (your local time)</span>
          <input className="input" type="datetime-local" value={s.examAt} onChange={(e) => set('examAt', e.target.value || DEFAULT_EXAM)} />
        </label>
      </section>
      <section className="card card-pad grid gap-5">
        <h2 className="font-bold">How confident do you feel?</h2>
        <Scale label="Statistics" value={s.confStats} onChange={(v) => set('confStats', v)} low="Not at all" high="Very" />
        <Scale label="Python (NumPy / SciPy)" value={s.confPython} onChange={(v) => set('confPython', v)} low="Not at all" high="Very" />
        <p className="text-sm text-muted">Lower confidence means the camp starts with the foundations and shows prerequisites more often.</p>
      </section>
      <section className="card card-pad grid gap-3">
        <h2 className="font-bold">Comfort</h2>
        <label className="inline-flex gap-2 items-center text-sm font-semibold"><input type="checkbox" className="w-4 h-4" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />Reduce motion (no confetti or animations)</label>
      </section>
      <div className="flex gap-3">
        <button className="btn btn-primary btn-lg" onClick={save}>{setup.done ? 'Save' : 'Build my plan'} <Icon name="arrow" /></button>
        {setup.done && <button className="btn btn-lg btn-ghost" onClick={() => nav(-1)}>Cancel</button>}
      </div>
    </motion.div>
  );
}
