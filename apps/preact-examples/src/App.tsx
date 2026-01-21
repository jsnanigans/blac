import { useState } from 'preact/hooks';
import { CounterDemo } from './examples/CounterDemo';
import { TodoDemo } from './examples/TodoDemo';
import { IsolatedDemo } from './examples/IsolatedDemo';

type Example = 'counter' | 'todo' | 'isolated';

export function App() {
  const [activeExample, setActiveExample] = useState<Example>('counter');

  return (
    <div className="app-container">
      <nav className="nav">
        <div className="nav-content">
          <div className="nav-brand">
            BlaC <span style={{ fontWeight: 400, opacity: 0.8 }}>Preact</span>
          </div>
          <ul className="nav-links">
            <li>
              <a
                href="#counter"
                className={activeExample === 'counter' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveExample('counter');
                }}
              >
                Counter
              </a>
            </li>
            <li>
              <a
                href="#todo"
                className={activeExample === 'todo' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveExample('todo');
                }}
              >
                Todo List
              </a>
            </li>
            <li>
              <a
                href="#isolated"
                className={activeExample === 'isolated' ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveExample('isolated');
                }}
              >
                Isolated
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <main className="view-wrapper">
        {activeExample === 'counter' && <CounterDemo />}
        {activeExample === 'todo' && <TodoDemo />}
        {activeExample === 'isolated' && <IsolatedDemo />}
      </main>
    </div>
  );
}
