// A small, precise SVG chart kit: linear scales, nice ticks, labelled axes with units,
// gridlines, and marks (line, area, band, bars, dots, rules). Everything scales with
// the container (viewBox), and colours come from the theme tokens (--s1…--s5).
import { createContext, useContext, useMemo, type PointerEvent as RPointerEvent, type ReactNode, type Ref } from 'react';

export const C = { s1: 'var(--s1)', s2: 'var(--s2)', s3: 'var(--s3)', s4: 'var(--s4)', s5: 'var(--s5)', good: 'var(--good)', bad: 'var(--bad)', muted: 'var(--muted)', accent: 'var(--accent)', ink: 'var(--ink)' };

export function niceTicks(min: number, max: number, n = 6) {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min];
  const span = max - min;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(+v.toFixed(12));
  return out;
}
export const fmt = (v: number, digits = 3) => {
  if (!isFinite(v)) return '–';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-3) return v.toExponential(2);
  return String(+v.toPrecision(digits));
};

interface Scales { sx: (x: number) => number; sy: (y: number) => number; w: number; h: number; x0: number; x1: number; y0: number; y1: number; inv: (px: number, py: number) => [number, number] }
const Ctx = createContext<Scales | null>(null);
export const useScales = () => useContext(Ctx)!;

export interface PlotProps {
  x: [number, number]; y: [number, number];
  xLabel?: string; yLabel?: string;
  width?: number; height?: number;
  xTicks?: number[]; yTicks?: number[];
  xFmt?: (v: number) => string; yFmt?: (v: number) => string;
  children: ReactNode;
  title?: string;
  onPointer?: (x: number, y: number, kind: 'down' | 'move' | 'up') => void;
  svgRef?: Ref<SVGSVGElement>;
}
const M = { l: 56, r: 16, t: 14, b: 44 };

export function Plot({ x, y, xLabel, yLabel, width = 640, height = 300, xTicks, yTicks, xFmt = fmt, yFmt = fmt, children, title, onPointer, svgRef }: PlotProps) {
  const w = width - M.l - M.r, h = height - M.t - M.b;
  const sc = useMemo<Scales>(() => {
    const sx = (v: number) => M.l + ((v - x[0]) / (x[1] - x[0] || 1)) * w;
    const sy = (v: number) => M.t + h - ((v - y[0]) / (y[1] - y[0] || 1)) * h;
    const inv = (px: number, py: number): [number, number] => [x[0] + ((px - M.l) / w) * (x[1] - x[0]), y[0] + ((M.t + h - py) / h) * (y[1] - y[0])];
    return { sx, sy, w, h, x0: x[0], x1: x[1], y0: y[0], y1: y[1], inv };
  }, [x[0], x[1], y[0], y[1], w, h]);
  const xt = xTicks || niceTicks(x[0], x[1], width > 500 ? 8 : 5);
  const yt = yTicks || niceTicks(y[0], y[1], 5);
  const handle = (kind: 'down' | 'move' | 'up') => (e: RPointerEvent<SVGSVGElement>) => {
    if (!onPointer) return;
    const svg = e.currentTarget;
    const pt = svg.getBoundingClientRect();
    const px = ((e.clientX - pt.left) / pt.width) * width, py = ((e.clientY - pt.top) / pt.height) * height;
    const [vx, vy] = sc.inv(px, py);
    onPointer(vx, vy, kind);
  };
  return (
    <Ctx.Provider value={sc}>
      <svg ref={svgRef} className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title || `${yLabel || ''} versus ${xLabel || ''}`}
        onPointerDown={onPointer ? handle('down') : undefined} onPointerMove={onPointer ? handle('move') : undefined} onPointerUp={onPointer ? handle('up') : undefined}>
        <defs><clipPath id={`clip-${width}-${height}`}><rect x={M.l} y={M.t} width={w} height={h} /></clipPath></defs>
        <g className="grid">
          {yt.map((v) => <line key={`gy${v}`} x1={M.l} x2={M.l + w} y1={sc.sy(v)} y2={sc.sy(v)} />)}
        </g>
        <g clipPath={`url(#clip-${width}-${height})`}>{children}</g>
        <g className="axis">
          <line x1={M.l} x2={M.l + w} y1={M.t + h} y2={M.t + h} />
          <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + h} />
          {xt.map((v) => (
            <g key={`x${v}`} transform={`translate(${sc.sx(v)},${M.t + h})`}>
              <line y2={5} /><text y={18} textAnchor="middle">{xFmt(v)}</text>
            </g>
          ))}
          {yt.map((v) => (
            <g key={`y${v}`} transform={`translate(${M.l},${sc.sy(v)})`}>
              <line x2={-5} /><text x={-8} dy="0.32em" textAnchor="end">{yFmt(v)}</text>
            </g>
          ))}
        </g>
        {xLabel && <text className="axis-title" x={M.l + w / 2} y={height - 6} textAnchor="middle">{xLabel}</text>}
        {yLabel && <text className="axis-title" transform={`translate(14,${M.t + h / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>}
      </svg>
    </Ctx.Provider>
  );
}

type Pt = [number, number];
const path = (pts: Pt[], sx: (v: number) => number, sy: (v: number) => number) => {
  let d = '', pen = false;
  for (const [a, b] of pts) {
    if (!isFinite(a) || !isFinite(b)) { pen = false; continue; }
    d += `${pen ? 'L' : 'M'}${sx(a).toFixed(2)},${sy(b).toFixed(2)}`;
    pen = true;
  }
  return d;
};

export function Line({ pts, color = C.s1, width = 2, dash, opacity = 1 }: { pts: Pt[]; color?: string; width?: number; dash?: string; opacity?: number }) {
  const { sx, sy } = useScales();
  return <path d={path(pts, sx, sy)} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} opacity={opacity} strokeLinejoin="round" strokeLinecap="round" />;
}
export function Area({ pts, base = 0, color = C.s1, opacity = 0.25 }: { pts: Pt[]; base?: number; color?: string; opacity?: number }) {
  const { sx, sy } = useScales();
  const f = pts.filter(([a, b]) => isFinite(a) && isFinite(b));
  if (f.length < 2) return null;
  const d = `${path(f, sx, sy)}L${sx(f[f.length - 1][0])},${sy(base)}L${sx(f[0][0])},${sy(base)}Z`;
  return <path d={d} fill={color} opacity={opacity} />;
}
export function Band({ lo, hi, color = C.s1, opacity = 0.18 }: { lo: Pt[]; hi: Pt[]; color?: string; opacity?: number }) {
  const { sx, sy } = useScales();
  if (lo.length < 2) return null;
  const d = `${path(hi, sx, sy)}${[...lo].reverse().map(([a, b]) => `L${sx(a)},${sy(b)}`).join('')}Z`;
  return <path d={d} fill={color} opacity={opacity} />;
}
export function Bars({ data, width, color = C.s1, base = 0, opacity = 0.85, colorOf }: { data: Pt[]; width: number; color?: string; base?: number; opacity?: number; colorOf?: (p: Pt, i: number) => string }) {
  const { sx, sy } = useScales();
  return <g>{data.map((p, i) => {
    const [a, b] = p;
    const x0 = sx(a - width / 2), x1 = sx(a + width / 2);
    const y0 = sy(Math.max(b, base)), y1 = sy(Math.min(b, base));
    return <rect key={i} x={Math.min(x0, x1)} y={y0} width={Math.max(0.5, Math.abs(x1 - x0) - 1)} height={Math.max(0, y1 - y0)} fill={colorOf ? colorOf(p, i) : color} opacity={opacity} rx={1.5} />;
  })}</g>;
}
export function Dots({ pts, color = C.s1, r = 3.5, opacity = 0.9, onDown }: { pts: Pt[]; color?: string; r?: number; opacity?: number; onDown?: (i: number) => void }) {
  const { sx, sy } = useScales();
  return <g>{pts.map(([a, b], i) => isFinite(a) && isFinite(b) && (
    <circle key={i} cx={sx(a)} cy={sy(b)} r={r} fill={color} opacity={opacity} style={onDown ? { cursor: 'grab' } : undefined}
      onPointerDown={onDown ? (e) => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); onDown(i); } : undefined} />
  ))}</g>;
}
export function VLine({ x, color = C.ink, dash = '5 4', width = 1.5, label }: { x: number; color?: string; dash?: string; width?: number; label?: string }) {
  const { sx, sy, y0, y1 } = useScales();
  if (!isFinite(x)) return null;
  return <g><line x1={sx(x)} x2={sx(x)} y1={sy(y0)} y2={sy(y1)} stroke={color} strokeDasharray={dash} strokeWidth={width} />
    {label && <text x={sx(x) + 4} y={sy(y1) + 12} style={{ fill: color, fontWeight: 700 }}>{label}</text>}</g>;
}
export function HLine({ y, color = C.muted, dash = '5 4', width = 1.2, label }: { y: number; color?: string; dash?: string; width?: number; label?: string }) {
  const { sx, sy, x0, x1 } = useScales();
  if (!isFinite(y)) return null;
  return <g><line x1={sx(x0)} x2={sx(x1)} y1={sy(y)} y2={sy(y)} stroke={color} strokeDasharray={dash} strokeWidth={width} />
    {label && <text x={sx(x1) - 4} y={sy(y) - 4} textAnchor="end" style={{ fill: color, fontWeight: 600 }}>{label}</text>}</g>;
}
export function Segment({ a, b, color = C.ink, width = 2, dash }: { a: Pt; b: Pt; color?: string; width?: number; dash?: string }) {
  const { sx, sy } = useScales();
  return <line x1={sx(a[0])} y1={sy(a[1])} x2={sx(b[0])} y2={sy(b[1])} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />;
}

export function Legend({ items }: { items: { label: string; color: string; dash?: boolean; box?: boolean }[] }) {
  return <div className="legend">{items.map((it) => (
    <span key={it.label}><i style={{ background: it.dash ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)` : it.color, height: it.box ? 10 : 3, width: it.box ? 12 : 14, opacity: it.box ? 0.5 : 1 }} />{it.label}</span>
  ))}</div>;
}

/** Histogram counts for values over [lo, hi] with n bins → bar data (centres) and the bin width. */
export function histogram(vals: number[], lo: number, hi: number, n: number) {
  const w = (hi - lo) / n;
  const counts = new Array(n).fill(0);
  for (const v of vals) { const k = Math.floor((v - lo) / w); if (k >= 0 && k < n) counts[k]++; else if (v === hi) counts[n - 1]++; }
  return { bars: counts.map((c, k) => [lo + (k + 0.5) * w, c] as Pt), width: w, max: Math.max(1, ...counts) };
}
export const range = (lo: number, hi: number, n: number) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
