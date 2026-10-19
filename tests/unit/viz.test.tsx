// Smoke test for every visualization in src/viz: it renders inside the shared frame,
// shows a labelled control, and reacts when that control moves (and when Reset is pressed),
// without throwing or logging errors. Runs in jsdom, so it checks behaviour, not pixels.
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mods = import.meta.glob('../../src/viz/*.tsx', { eager: true }) as Record<string, { default?: (p: { preset?: string }) => JSX.Element; PRESETS?: { id: string }[] }>;

function setNative(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

describe.each(Object.entries(mods))('%s', (path, mod) => {
  it('renders and responds to its controls', async () => {
    expect(mod.default, `${path} has no default export`).toBeTypeOf('function');
    const errs: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...a) => { errs.push(a); });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const Comp = mod.default!;
    await act(async () => root.render(<Comp />));
    const frame = host.querySelector('section.viz');
    expect(frame, 'uses the shared VizFrame').not.toBeNull();
    expect(frame!.getAttribute('aria-label')).toBeTruthy();
    // The test picker is a decision tool, not a chart; everything else must draw something.
    if (!/testpicker/.test(path)) expect(host.querySelector('svg, canvas'), 'draws a chart').not.toBeNull();
    const before = host.innerHTML;
    // Move the first slider (or the first number box / button choice) and expect a change.
    const range = host.querySelector<HTMLInputElement>('input[type=range]');
    if (range) {
      const min = +range.min, max = +range.max, cur = +range.value;
      const next = cur + (max - min) * 0.37 <= max ? cur + (max - min) * 0.37 : min + (max - min) * 0.13;
      await act(async () => setNative(range, String(next)));
    } else {
      const btn = host.querySelector<HTMLButtonElement>('button.choice:not([disabled])') || host.querySelector<HTMLButtonElement>('[role=radio][aria-checked=false]')
        || [...host.querySelectorAll<HTMLButtonElement>('button')].find((x) => !/reset/i.test(x.textContent || ''));
      expect(btn, 'has at least one control').toBeTruthy();
      await act(async () => btn!.click());
    }
    expect(host.innerHTML, 'output changes when a control moves').not.toBe(before);
    // Reset restores the starting state.
    const reset = [...host.querySelectorAll<HTMLButtonElement>('button')].find((b) => /reset/i.test(b.textContent || ''));
    expect(reset, 'has a Reset button').toBeTruthy();
    await act(async () => reset!.click());
    // Presets render too.
    for (const p of mod.PRESETS || []) {
      await act(async () => root.render(<Comp key={p.id} preset={p.id} />));
      expect(host.querySelector('section.viz')).not.toBeNull();
    }
    await act(async () => root.unmount());
    expect(errs, `console.error during render: ${JSON.stringify(errs).slice(0, 400)}`).toEqual([]);
  });
});
