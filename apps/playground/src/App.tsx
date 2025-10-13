import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { RootLayout } from './core/layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { GuidePage } from './pages/GuidePage';
import { GuideDemo } from './pages/GuideDemo';
import { PlaygroundPageMultiFile } from './pages/PlaygroundPageMultiFile';
import PrototypeTest from './pages/prototype-test';
import GraphTest from './pages/graph-test';
import { guideStructure } from './core/guide/guideStructure';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />

        {/* Guide Routes */}
        <Route path="guide">
          <Route index element={<GuidePage />} />
          <Route path=":sectionId/:demoId" element={<GuideDemo />} />
          {/* Redirect section-only paths to first demo */}
          <Route path=":sectionId" element={<RedirectToFirstDemo />} />
        </Route>

        {/* Legacy Demo Routes - Redirect to Guide */}
        <Route path="demos" element={<Navigate to="/guide" replace />} />
        <Route path="demos/:category/:demoId" element={<RedirectToGuide />} />

        <Route path="playground" element={<PlaygroundPageMultiFile />} />
        <Route path="prototype-test" element={<PrototypeTest />} />
        <Route path="graph-test" element={<GraphTest />} />
      </Route>
    </Routes>
  );
}

// Helper component to redirect old demo routes to new guide routes
function RedirectToGuide() {
  const { category, demoId } = useParams<{ category: string; demoId: string }>();

  // Map old category to new section
  const sectionMap: Record<string, string> = {
    '01-basics': 'getting-started',
    '02-core-concepts': 'core-concepts',
    '02-patterns': 'patterns',
    '03-advanced': 'advanced',
    '04-plugins': 'plugins',
    '05-testing': 'testing',
    '06-real-world': 'real-world'
  };

  const sectionId = category ? sectionMap[category] : null;
  if (sectionId && demoId) {
    return <Navigate to={`/guide/${sectionId}/${demoId}`} replace />;
  }

  return <Navigate to="/guide" replace />;
}

// Helper component to redirect section-only paths to first demo
function RedirectToFirstDemo() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const section = guideStructure.sections.find(s => s.id === sectionId);

  if (section && section.demos.length > 0) {
    return <Navigate to={`/guide/${sectionId}/${section.demos[0]}`} replace />;
  }

  return <Navigate to="/guide" replace />;
}

export default App;
