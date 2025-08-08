import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './core/layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { PlaygroundPageMultiFile } from './pages/PlaygroundPageMultiFile';
import { LearnPage } from './pages/LearnPage';
import { ApiPage } from './pages/ApiPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="demos/*" element={<DemosPage />} />
        <Route path="playground" element={<PlaygroundPageMultiFile />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="api" element={<ApiPage />} />
      </Route>
    </Routes>
  );
}

export default App;
