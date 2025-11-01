import { useState } from 'react';
import { useBloc } from '@blac/react';
import { TodoBloc } from './TodoBloc';
import { Button } from '../../shared/components';

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
    if (text.trim()) {
      todoBloc.addTodo(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="row-sm">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="Add todo"
        />
        <Button type="submit" variant="primary">
          Add
        </Button>
      </div>
    </form>
  );
}
