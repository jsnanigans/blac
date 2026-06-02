---
title: Undo / Redo
description: Implement undo/redo in a Cubit with past and future state stacks, a history cap, and getters for canUndo/canRedo.
---

**Use when:** users need to reverse discrete actions — a text editor, a canvas,
a form with destructive bulk edits.
**Don't use when:** the state is large and serialization is expensive; consider
structural sharing or operation-log approaches instead.

## Pattern

Keep a stack of past states and a stack of future states alongside the current
one. Each mutation saves the previous state to `past`; undo pops from `past` and
pushes to `future`; redo reverses that.

```ts twoslash
import { Cubit } from '@blac/core';

// The domain value being edited.
interface Note {
  title: string;
  body: string;
}

interface EditorState {
  note: Note;
  past: Note[]; // oldest … newest-before-current
  future: Note[]; // most-recently-undone … oldest-undone
}
// ---cut---
class EditorCubit extends Cubit<EditorState, Note> {
  // Hard cap prevents unbounded memory growth.
  private static readonly MAX_HISTORY = 50;

  // One instance per note title — args both seed and key the instance.
  static key = (initial: Note) => initial.title;

  constructor() {
    super({ note: { title: '', body: '' }, past: [], future: [] });
  }

  protected init(initial: Note) {
    this.emit({ note: initial, past: [], future: [] });
  }

  /** Push the current note onto the past stack, then apply `next`. */
  private applyChange(next: Note) {
    const { note, past } = this.state;
    const trimmed = past.slice(-(EditorCubit.MAX_HISTORY - 1));
    this.emit({ note: next, past: [...trimmed, note], future: [] });
    //                                                 ^^^^^^^^
    // ⚠️ Always clear `future` on a new edit — an undo-then-type flow should
    // not let the user redo the overwritten branch.
  }

  setTitle = (title: string) => {
    this.applyChange({ ...this.state.note, title });
  };

  setBody = (body: string) => {
    this.applyChange({ ...this.state.note, body });
  };

  undo = () => {
    const { note, past, future } = this.state;
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    this.emit({
      note: previous,
      past: past.slice(0, -1),
      future: [note, ...future],
    });
  };

  redo = () => {
    const { note, past, future } = this.state;
    if (future.length === 0) return;

    const next = future[0];
    this.emit({
      note: next,
      past: [...past, note],
      future: future.slice(1),
    });
  };

  get canUndo() {
    return this.state.past.length > 0;
  }

  get canRedo() {
    return this.state.future.length > 0;
  }
}
```

```tsx
function NoteEditor({ initial }: { initial: { title: string; body: string } }) {
  // `static key` derives identity from the title — one EditorCubit per note.
  const [state, editor] = useBloc(EditorCubit, {
    args: initial,
    select: (s, bloc) => [
      s.note.title,
      s.note.body,
      bloc.canUndo,
      bloc.canRedo,
    ],
  });

  return (
    <div>
      <input
        value={state.note.title}
        onChange={(e) => editor.setTitle(e.target.value)}
      />
      <textarea
        value={state.note.body}
        onChange={(e) => editor.setBody(e.target.value)}
      />
      <button onClick={editor.undo} disabled={!editor.canUndo}>
        Undo
      </button>
      <button onClick={editor.redo} disabled={!editor.canRedo}>
        Redo
      </button>
    </div>
  );
}
```

:::tip[History cap]
Without `MAX_HISTORY`, a long editing session accumulates unbounded state
snapshots. Cap it and trim the oldest entries — `past.slice(-(MAX - 1))` keeps
the most recent `MAX - 1` entries before adding the new one.
:::

:::caution[Avoid storing derived state in history]
Only snapshot values that are the _source of truth_ (here, `note`). Including
computed flags or loading status in the history stack inflates its size and can
produce impossible states on undo.
:::

## See also

- [Cubit](/core/cubit) — `emit` replaces wholesale; `update` derives from current state
- [Patterns](/guide/patterns) — getter-based computed values (`canUndo`/`canRedo`)
