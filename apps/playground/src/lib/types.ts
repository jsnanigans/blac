export interface PlaygroundFile {
  id: string;
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'css' | 'json';
}

export interface PlaygroundState {
  files: PlaygroundFile[];
  activeFileId: string;
}

export function getFileLanguage(fileName: string): PlaygroundFile['language'] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    default:
      return 'typescript';
  }
}

export function createFile(name: string, content: string = ''): PlaygroundFile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    name,
    content,
    language: getFileLanguage(name),
  };
}

export const DEFAULT_FILES: PlaygroundFile[] = [
  {
    id: 'main',
    name: 'App.tsx',
    content: `import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React from 'react';

// CSS is automatically loaded from styles.css

// Create your own Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

// Create a React component that uses the Cubit
export function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="counter-container">
      <h2 className="counter-title">Counter: {count}</h2>
      <div className="button-group">
        <button 
          onClick={counterCubit.increment}
          className="btn btn-primary"
        >
          Increment
        </button>
        <button 
          onClick={counterCubit.decrement}
          className="btn btn-danger"
        >
          Decrement
        </button>
        <button 
          onClick={counterCubit.reset}
          className="btn btn-secondary"
        >
          Reset
        </button>
      </div>
    </div>
  );
}`,
    language: 'typescript',
  },
  {
    id: 'styles',
    name: 'styles.css',
    content: `.counter-container {
  padding: 1rem;
  font-family: system-ui, -apple-system, sans-serif;
}

.counter-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
}`,
    language: 'css',
  },
];