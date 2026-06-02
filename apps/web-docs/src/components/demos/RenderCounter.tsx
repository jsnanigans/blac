import { useRef } from 'react';
import './demos.css';

export interface RenderCounterProps {
  /** Label before the count. Defaults to "renders". */
  label?: string;
}

/**
 * Displays how many times *this component instance* has rendered. The workhorse
 * for blac's value-prop demos: drop one inside any subtree and watch whether it
 * ticks when sibling state changes — proving (or disproving) re-render
 * isolation.
 *
 * CRITICAL MECHANIC: the counter is incremented in the **render body**, not in
 * a `useEffect`. A render that React commits but whose effects are batched, or
 * a render React throws away, still counts here — which is exactly what we want
 * to visualize. Incrementing in `useEffect` would under-count and misrepresent
 * the claim. `useRef` (not `useState`) keeps the increment from itself
 * triggering a re-render loop.
 *
 * Each mounted `<RenderCounter />` is its own instance with its own count, so
 * place one per subtree you want to observe independently.
 */
export function RenderCounter({ label = 'renders' }: RenderCounterProps) {
  const count = useRef(0);
  // Render-body increment — see the doc comment above for why.
  count.current += 1;

  return (
    <span className="blac-demo-render-counter" role="status">
      <span className="blac-demo-render-counter__label">{label}</span>
      <span className="blac-demo-render-counter__count">{count.current}</span>
    </span>
  );
}

export default RenderCounter;
