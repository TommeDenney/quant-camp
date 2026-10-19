// Accessible controls for the simulators: a slider paired with a number box,
// toggles, segmented choices, stat tiles and the frame every visualization uses.
import { useId, type ReactNode } from 'react';

export function Slider({ label, value, min, max, step = 1, onChange, unit }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  const id = useId();
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="slider-row">
      <label htmlFor={id}>{label}{unit ? <span className="text-muted font-normal"> ({unit})</span> : null}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
      <input type="number" min={min} max={max} step={step} value={+value.toFixed(6)} aria-label={`${label} value`}
        onChange={(e) => { const v = parseFloat(e.target.value); if (isFinite(v)) onChange(clamp(v)); }} />
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer select-none" style={{ color: 'var(--ink-2)' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
      {label}
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-xl gap-1" style={{ background: 'var(--surface-2)' }}>
      {options.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)} className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={value === v ? { background: 'var(--surface)', color: 'var(--accent)', boxShadow: 'var(--shadow)' } : { color: 'var(--muted)' }}>{l}</button>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  return <div className="stat"><span>{label}</span><b style={tone ? { color: `var(--${tone})` } : undefined}>{value}</b></div>;
}

export interface Preset<P> { id: string; label: string; params: P }
/** The frame around every simulator: title, presets, reset, controls, chart, explanation. */
export function VizFrame<P>({ title, subtitle, presets, onPreset, onReset, controls, children, explain, stats }: {
  title: string; subtitle?: string; presets?: Preset<P>[]; onPreset?: (p: Preset<P>) => void; onReset: () => void;
  controls?: ReactNode; children: ReactNode; explain?: ReactNode; stats?: ReactNode;
}) {
  return (
    <section className="card card-pad grid gap-4 viz" aria-label={title}>
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div><div className="eyebrow">Interactive</div><h3 className="text-lg font-bold">{title}</h3>{subtitle && <p className="text-sm text-muted">{subtitle}</p>}</div>
        <div className="flex flex-wrap gap-2 items-center no-print">
          {presets && presets.length > 0 && (
            <select className="input text-sm py-1.5" aria-label="Preset examples" defaultValue="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p && onPreset) onPreset(p); }}>
              <option value="" disabled>Examples…</option>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          )}
          <button className="btn btn-sm" onClick={onReset}>Reset</button>
        </div>
      </header>
      {controls && <div className="grid gap-2.5">{controls}</div>}
      <div>{children}</div>
      {stats && <div className="flex flex-wrap gap-2">{stats}</div>}
      {explain && <div className="viz-explain">{explain}</div>}
    </section>
  );
}
