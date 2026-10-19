// Rewards: a burst of stars for a correct answer, confetti for a strong result,
// and a gentle toast when a topic reaches a new mastery level. Respects reduced motion.
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useProgress } from '../store/progress';

const calm = () => useProgress.getState().reducedMotion;

export function celebrate(kind: 'small' | 'big' | 'huge' = 'small') {
  if (calm()) return;
  const colors = ['#7C9CFF', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'];
  if (kind === 'small') confetti({ particleCount: 40, spread: 55, startVelocity: 32, origin: { y: 0.7 }, colors, scalar: 0.8 });
  else if (kind === 'big') { confetti({ particleCount: 110, spread: 80, origin: { y: 0.65 }, colors }); setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.6 }, colors, shapes: ['star'] }), 220); }
  else {
    const end = Date.now() + 900;
    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, colors, shapes: ['star', 'circle'] });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, colors, shapes: ['star', 'circle'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}

type Toast = { id: number; title: string; body?: string; tone: 'good' | 'level' | 'info' };
let push: (t: Omit<Toast, 'id'>) => void = () => {};
export const toast = (t: Omit<Toast, 'id'>) => push(t);

export function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Math.random();
      setList((l) => [...l.slice(-2), { ...t, id }]);
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3800);
    };
  }, []);
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} className={`toast toast-${t.tone}`} initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 380, damping: 28 }}>
            <span className="toast-icon">{t.tone === 'level' ? '▲' : t.tone === 'good' ? '★' : 'i'}</span>
            <div><b>{t.title}</b>{t.body && <div className="text-sm opacity-80">{t.body}</div>}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** A small "+N ★" that floats up from where you answered. */
export function StarPop({ n, show }: { n: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && n > 0 && (
        <motion.span className="star-pop" initial={{ opacity: 0, y: 6, scale: 0.6 }} animate={{ opacity: 1, y: -18, scale: 1 }} exit={{ opacity: 0, y: -34 }} transition={{ duration: 0.7 }}>
          +{n} ★
        </motion.span>
      )}
    </AnimatePresence>
  );
}
