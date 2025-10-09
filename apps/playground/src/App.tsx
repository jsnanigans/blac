import { Routes, Route } from 'react-router-dom';
import { RootLayout } from './core/layouts/RootLayout';
import { HomePage } from './pages/HomePage';
import { DemosPage } from './pages/DemosPage';
import { PlaygroundPageMultiFile } from './pages/PlaygroundPageMultiFile';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="demos/*" element={<DemosPage />} />
        <Route path="playground" element={<PlaygroundPageMultiFile />} />
      </Route>
    </Routes>
  );
}

export default App;
