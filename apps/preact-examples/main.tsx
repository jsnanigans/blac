import { render } from 'preact';
import { App } from './src/App';
import './src/styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find root element');
}

render(<App />, container);
