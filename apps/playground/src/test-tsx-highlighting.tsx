// Test file to verify TSX syntax highlighting
import React from 'react';

interface TestProps {
  name: string;
  count: number;
}

export function TestComponent({ name, count }: TestProps) {
  const [state, setState] = React.useState(0);

  return (
    <div className="test-container">
      <h1>Hello {name}</h1>
      <p>Count: {count + state}</p>
      <button onClick={() => setState((s) => s + 1)}>Increment</button>
    </div>
  );
}

// This file should have proper syntax highlighting for:
// 1. TypeScript types (interface, type annotations)
// 2. JSX elements (<div>, <h1>, etc.)
// 3. JSX expressions ({name}, {count + state})
// 4. React hooks (useState)
