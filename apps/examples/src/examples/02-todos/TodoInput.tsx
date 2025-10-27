import { useState } from 'react';
import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';

interface TodoInputProps {
  instanceKey?: string;
}

/**
 * Input for adding new todos.
 * This component doesn't access any state, so it never re-renders
 * unless its own local state changes.
 */
export function TodoInput({ instanceKey }: TodoInputProps) {
  const [, todoBloc] = useBloc(TodoBloc, { instanceId: instanceKey });
  const [text, setText] = useState('');

  console.log('[TodoInput] Rendering');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    todoBloc.addTodo(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="stack-sm">
      <div className="input-group">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="Add todo"
        />
        <button type="submit">Add</button>
      </div>
    </form>
  );
}
