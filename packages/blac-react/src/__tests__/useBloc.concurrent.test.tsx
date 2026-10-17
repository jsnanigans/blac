import { it, expect, vi } from 'vite-plus/test';
import { startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

blacTestSetup();

let constructed = 0;
class CountedCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
    constructed++;
  }
}

function Consumer() {
  const [state] = useBloc(CountedCubit);
  return <span>{state.n}</span>;
}

function Slow() {
  const end = performance.now() + 20;
  while (performance.now() < end) {
    // busy-wait so React's scheduler yields after this component
  }
  return null;
}

it('a time-sliced render that yields before commit keeps its instance', async () => {
  const actEnv = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
  const el = document.createElement('div');
  const root = createRoot(el);

  startTransition(() => {
    root.render(
      <>
        <Consumer />
        <Slow />
        <Slow />
      </>,
    );
  });
  await vi.waitFor(() => expect(el.textContent).toBe('0'));

  expect(constructed).toBe(1);
  root.unmount();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = actEnv;
});

class LabelCubit extends Cubit<{ n: number; label: string }> {
  constructor() {
    super({ n: 0, label: 'a' });
  }
  setLabel(label: string) {
    this.patch({ label });
  }
}

it('a change flushed between render and commit re-renders', async () => {
  const actEnv = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
  const el = document.createElement('div');
  const root = createRoot(el);
  let showLabel = false;
  let bloc: LabelCubit | undefined;
  function App() {
    const [state, b] = useBloc(LabelCubit);
    bloc = b;
    return <span>{showLabel ? state.label : state.n}</span>;
  }
  // Rendered after App in the same pass; the yields after it let the
  // microtask flush run before commit.
  function Mutate() {
    if (showLabel) queueMicrotask(() => bloc?.setLabel('b'));
    return null;
  }
  const tree = () => (
    <>
      <App />
      <Mutate />
      <Slow />
      <Slow />
    </>
  );
  startTransition(() => root.render(tree()));
  await vi.waitFor(() => expect(el.textContent).toBe('0'));
  showLabel = true;
  startTransition(() => root.render(tree()));
  await vi.waitFor(() => expect(el.textContent).toBe('b'));
  root.unmount();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = actEnv;
});
