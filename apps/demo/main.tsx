import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Blac (optional, if you need to configure global Blac settings)
// import { Blac } from '@blac/core';
// Blac.instance.config({ logLevel: 'DEBUG' });

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
