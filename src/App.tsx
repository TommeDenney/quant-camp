// Routes. HashRouter keeps every page working on GitHub Pages (no server rewrites).
import { MotionConfig } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toaster } from './components/Reward';
import Dashboard from './pages/Dashboard';
import { LabPage, LabsIndex } from './pages/Labs';
import Learn from './pages/Learn';
import LessonPlayer from './pages/LessonPlayer';
import Mock from './pages/Mock';
import { Glossary, Notes } from './pages/Notes';
import Onboarding from './pages/Onboarding';
import Practice from './pages/Practice';
import PythonLab from './pages/PythonLab';
import Quiz from './pages/Quiz';
import Reference from './pages/Reference';
import FindIt from './pages/FindIt';
import { useProgress } from './store/progress';

/** Scroll to the top on navigation, or to #id when the route has one (e.g. /glossary#Kurtosis). */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const t = setTimeout(() => (document.getElementById(id) || document.getElementById(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 260);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

function NeedsSetup({ children }: { children: ReactNode }) {
  const done = useProgress((s) => s.setup.done);
  return done ? <>{children}</> : <Navigate to="/setup" replace />;
}

export default function App() {
  const reduced = useProgress((s) => s.reducedMotion);
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <HashRouter>
        <ScrollManager />
        <Layout>
          <Routes>
            <Route path="/" element={<NeedsSetup><Dashboard /></NeedsSetup>} />
            <Route path="/setup" element={<Onboarding />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:id" element={<LessonPlayer />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/mock" element={<Mock />} />
            <Route path="/reference" element={<Reference />} />
            <Route path="/findit" element={<FindIt />} />
            <Route path="/python" element={<PythonLab />} />
            <Route path="/labs" element={<LabsIndex />} />
            <Route path="/labs/:id" element={<LabPage />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        <Toaster />
      </HashRouter>
    </MotionConfig>
  );
}
