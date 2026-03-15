import { useBloc } from '@blac/react';
import { useState } from 'react';
import { TodoCubit } from './TodoCubit';
import { Button, RenderCounter } from '../../shared/components';

export function QuickAdd() {
  const [, bloc] = useBloc(TodoCubit, { autoTrack: false });
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    bloc.addTodo(text);
    setText('');
  };

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="QuickAdd" />
      <form onSubmit={handleSubmit} className="todo-input">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
        />
        <Button type="submit" variant="primary" disabled={!text.trim()}>
          Add
        </Button>
      </form>
      <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
        Action-only: this component never reads TodoCubit state, so it only
        re-renders from its own local input state.
      </p>
    </div>
  );
}
