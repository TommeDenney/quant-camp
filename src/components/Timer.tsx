// A 25-minute focus timer. Running time is added to "time studied" as it passes.
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../store/progress';
import { Icon } from './Icon';
import { celebrate, toast } from './Reward';

const FOCUS = 25 * 60_000;

export function FocusTimer() {
  const addStudyTime = useProgress((s) => s.addStudyTime);
  const addStars = useProgress((s) => s.addStars);
  const [left, setLeft] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const last = useRef(0);
  const pending = useRef(0);
  const leftRef = useRef(FOCUS);

  useEffect(() => {
    if (!running) return;
    last.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now(), dt = now - last.current;
      last.current = now;
      pending.current += dt;
      if (pending.current >= 15_000) { addStudyTime(pending.current); pending.current = 0; }
      const n = leftRef.current - dt;
      if (n <= 0) {
        setRunning(false);
        addStudyTime(pending.current); pending.current = 0;
        addStars(3);
        toast({ tone: 'good', title: 'Focus session complete (+3 ★)', body: 'Take a 5-minute break: stand up, look away from the screen.' });
        celebrate('small');
        leftRef.current = FOCUS;
      } else leftRef.current = n;
      setLeft(leftRef.current);
    }, 500);
    return () => { clearInterval(id); if (pending.current) { addStudyTime(pending.current); pending.current = 0; } };
  }, [running]);

  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return (
    <div className="flex items-center gap-1 rounded-xl px-1.5 py-1" style={{ background: 'var(--surface-2)' }} role="timer" aria-label="Focus timer">
      <button className="btn btn-sm btn-ghost" onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pause focus timer' : 'Start a 25-minute focus session'} title={running ? 'Pause' : 'Start a 25-minute focus session'}>
        <Icon name={running ? 'pause' : 'timer'} size={16} />
        <span className="tabular-nums font-bold" style={{ color: running ? 'var(--accent)' : undefined }}>{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
      </button>
      {left !== FOCUS && !running && <button className="btn btn-sm btn-ghost" aria-label="Reset timer" onClick={() => { leftRef.current = FOCUS; setLeft(FOCUS); }}><Icon name="reset" size={14} /></button>}
    </div>
  );
}
