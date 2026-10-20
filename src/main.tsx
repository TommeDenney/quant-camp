import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useProgress } from './store/progress';

// Theme and motion preferences live on <html> so CSS (and print) can see them.
const apply = () => {
  const { theme, reducedMotion } = useProgress.getState();
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
};
apply();
useProgress.subscribe(apply);

// Offline support: only in the production build, scoped to the GitHub Pages base path.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
