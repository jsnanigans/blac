import { useEffect, useMemo, useRef, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { PatchBay, useJack, usePatch } from '../../patchbay/PatchBay';
import './hero-bay.css';

interface AppState {
  count: number;
  user: { name: string };
  theme: 'dark' | 'light';
  cart: { items: string[] };
}

const NAMES = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan'];
const ITEMS = ['🎛️', '🔌', '🎚️', '💡', '🔋'];

class AppCubit extends Cubit<AppState> {
  constructor() {
    super({
      count: 0,
      user: { name: 'Ada' },
      theme: 'dark',
      cart: { items: [] },
    });
  }

  increment = () => this.patch({ count: this.state.count + 1 });
  rename = () =>
    this.patch({
      user: {
        name: NAMES[(NAMES.indexOf(this.state.user.name) + 1) % NAMES.length]!,
      },
    });
  toggleTheme = () =>
    this.patch({ theme: this.state.theme === 'dark' ? 'light' : 'dark' });
  addToCart = () => {
    const { items } = this.state.cart;
    this.emit({
      ...this.state,
      cart: {
        items: items.length >= 4 ? [] : [...items, ITEMS[items.length]!],
      },
    });
  };
}

const JACKS = [
  { key: 'count', label: '+1', action: 'increment' },
  { key: 'user.name', label: 'rename', action: 'rename' },
  { key: 'theme', label: 'flip', action: 'toggleTheme' },
  { key: 'cart.items', label: 'add', action: 'addToCart' },
] as const;

function useRenders() {
  const n = useRef(0);
  n.current += 1;
  return n.current;
}

function Renders({ n }: { n: number }) {
  return (
    <span className="renders" aria-label={`${n} renders`}>
      renders <b>{n}</b>
    </span>
  );
}

function Jack({
  jackKey,
  value,
  label,
  onFire,
}: {
  jackKey: string;
  value: string;
  label: string;
  onFire: () => void;
}) {
  const ref = useJack(jackKey);
  return (
    <div className="jack-row">
      <span className="jack-label">
        <span className="jack-path">{jackKey}</span>
        <span className="jack-value">{value}</span>
      </span>
      <button
        type="button"
        className="fire"
        onClick={onFire}
        aria-label={`Change ${jackKey}`}
      >
        {label}
      </button>
      <span className="socket" ref={ref} />
    </div>
  );
}

/** The cubit's own panel: shows every value, so it reads (and re-renders on) everything. */
function AppModule() {
  const [state, app] = useBloc(AppCubit);
  const values: Record<string, string> = {
    count: String(state.count),
    'user.name': `"${state.user.name}"`,
    theme: `"${state.theme}"`,
    'cart.items': `[${state.cart.items.length}]`,
  };
  return (
    <section
      className="module"
      aria-label="AppCubit state"
      data-mount
      data-inlet
    >
      <header className="module-head">
        <span className="module-name">AppCubit</span>
        <span className="power kicker">live</span>
      </header>
      {JACKS.map((j) => (
        <Jack
          key={j.key}
          jackKey={j.key}
          value={values[j.key]!}
          label={j.label}
          onFire={app[j.action]}
        />
      ))}
    </section>
  );
}

function Unit({
  name,
  reads,
  renders,
  plug,
  cardRef,
  children,
}: {
  name: string;
  reads: string[];
  renders: number;
  plug: (key: string) => (el: HTMLElement | null) => void;
  cardRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <article
      className="unit"
      ref={cardRef as React.RefObject<HTMLElement>}
      data-mount
    >
      <span className="unit-inputs" aria-hidden="true">
        {reads.map((k) => (
          <span key={k} className="unit-input" ref={plug(k)} />
        ))}
      </span>
      <p className="unit-name">
        &lt;{name} /&gt; <Renders n={renders} />
      </p>
      <div className="unit-body">{children}</div>
      <p className="unit-reads">
        {reads.length
          ? reads.map((r) => <code key={r}>{r}</code>)
          : 'reads nothing'}
      </p>
    </article>
  );
}

function Counter() {
  const [state] = useBloc(AppCubit);
  const renders = useRenders();
  const { card, plug } = usePatch<HTMLElement>('Counter', {
    count: state.count,
  });
  return (
    <Unit
      name="Counter"
      reads={['count']}
      renders={renders}
      plug={plug}
      cardRef={card}
    >
      Clicked <strong>{state.count}</strong> times
    </Unit>
  );
}

function Avatar() {
  const [state] = useBloc(AppCubit);
  const renders = useRenders();
  const { card, plug } = usePatch<HTMLElement>('Avatar', {
    'user.name': state.user.name,
  });
  return (
    <Unit
      name="Avatar"
      reads={['user.name']}
      renders={renders}
      plug={plug}
      cardRef={card}
    >
      <span className="avatar">{state.user.name[0]}</span> {state.user.name}
    </Unit>
  );
}

function Toolbar() {
  const [state] = useBloc(AppCubit);
  const renders = useRenders();
  const { card, plug } = usePatch<HTMLElement>('Toolbar', {
    'user.name': state.user.name,
    theme: state.theme,
  });
  return (
    <Unit
      name="Toolbar"
      reads={['user.name', 'theme']}
      renders={renders}
      plug={plug}
      cardRef={card}
    >
      Hi {state.user.name} · {state.theme === 'dark' ? '☾' : '☀'} {state.theme}
    </Unit>
  );
}

function Cart() {
  const [state] = useBloc(AppCubit);
  const renders = useRenders();
  const items = state.cart.items;
  const { card, plug } = usePatch<HTMLElement>('Cart', { 'cart.items': items });
  return (
    <Unit
      name="Cart"
      reads={['cart.items']}
      renders={renders}
      plug={plug}
      cardRef={card}
    >
      {items.length ? items.join(' ') : <span className="muted">empty</span>}
    </Unit>
  );
}

/** Fires a random jack every few seconds until the visitor touches the bay. */
function useIdlePlay(host: React.RefObject<HTMLElement | null>) {
  const [, app] = useBloc(AppCubit);
  useEffect(() => {
    const el = host.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    const io = new IntersectionObserver(
      ([e]) => (visible = !!e?.isIntersecting),
    );
    io.observe(el);
    const timer = setInterval(() => {
      if (!visible || document.hidden) return;
      app[JACKS[Math.floor(Math.random() * JACKS.length)]!.action]();
    }, 2200);
    const stop = () => clearInterval(timer);
    el.addEventListener('pointerdown', stop, { once: true });
    el.addEventListener('keydown', stop, { once: true });
    return () => {
      stop();
      io.disconnect();
    };
  }, [host, app]);
}

export default function HeroBay() {
  const host = useRef<HTMLDivElement>(null);
  const [backend, setBackend] = useState<'insomni' | 'svg' | null>(null);
  useIdlePlay(host);
  // Same element every render: only blac may re-render the units, never this parent.
  const stage = useMemo(
    () => (
      <>
        <AppModule />
        <div className="hero-units">
          <Counter />
          <Avatar />
          <Toolbar />
          <Cart />
        </div>
      </>
    ),
    [],
  );
  return (
    <div ref={host} className="hero-bay-wrap">
      <PatchBay className="hero-bay" onRenderer={setBackend}>
        {stage}
      </PatchBay>
      <p className="hero-bay-note kicker">
        Real <code>useBloc</code>, real renders. Press a jack: only what reads
        it lights up.
        {backend && (
          <span className="backend">
            {' '}
            Cables: {backend === 'insomni' ? 'insomni on WebGPU' : 'SVG'}.
          </span>
        )}
      </p>
    </div>
  );
}
