import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { PatchBay, useJack, usePatch } from '../../patchbay/PatchBay';
import { useBeat } from '../../lib/useBeat';
import '../stage.css';

interface Todo {
  title: string;
  done: boolean;
}

interface ProfileState {
  user: { name: string; email: string };
  items: Todo[];
}

const NAMES = ['Ada', 'Grace', 'Linus', 'Margaret'];
const TITLES = [
  'Wire the bay',
  'Patch the cables',
  'Ship it',
  'Tune the knobs',
];

class ProfileCubit extends Cubit<ProfileState, { _id: string }> {
  static key = (a: { _id: string }) => a._id;

  constructor() {
    super({
      user: { name: 'Ada', email: 'ada@42.dog' },
      items: [
        { title: 'Wire the bay', done: false },
        { title: 'Patch the cables', done: false },
      ],
    });
  }

  rename = () =>
    this.patch({
      user: {
        name: NAMES[(NAMES.indexOf(this.state.user.name) + 1) % NAMES.length]!,
      },
    });
  changeEmail = () =>
    this.patch({
      user: {
        email: `${this.state.user.name.toLowerCase()}+${Date.now() % 1000}@42.dog`,
      },
    });
  replaceUser = () =>
    this.emit({ ...this.state, user: { ...this.state.user } });
  addItem = () => {
    const items = this.state.items;
    const next =
      items.length >= 4
        ? items.slice(0, 2)
        : [...items, { title: TITLES[items.length]!, done: false }];
    this.emit({ ...this.state, items: next });
  };
  retitleFirst = () =>
    this.emit({
      ...this.state,
      items: this.state.items.map((t, i) =>
        i === 0
          ? {
              ...t,
              title:
                t.title === 'Wire the bay' ? 'Rewire the bay' : 'Wire the bay',
            }
          : t,
      ),
    });
  toggleFirstDone = () =>
    this.emit({
      ...this.state,
      items: this.state.items.map((t, i) =>
        i === 0 ? { ...t, done: !t.done } : t,
      ),
    });
}

type Action =
  | 'rename'
  | 'changeEmail'
  | 'replaceUser'
  | 'addItem'
  | 'retitleFirst'
  | 'toggleFirstDone';

const JACKS: { key: string; action: Action; label: string; call: string }[] = [
  {
    key: 'user.name',
    action: 'rename',
    label: 'rename',
    call: "patch({ user: { name: 'Grace' } })",
  },
  {
    key: 'user.email',
    action: 'changeEmail',
    label: 'edit',
    call: "patch({ user: { email: '…' } })",
  },
  {
    key: 'user',
    action: 'replaceUser',
    label: 'replace',
    call: 'emit({ ...state, user: { ...user } })',
  },
  {
    key: 'items.length',
    action: 'addItem',
    label: 'add',
    call: 'emit({ ...state, items: [...items, todo] })',
  },
  {
    key: 'items[0].title',
    action: 'retitleFirst',
    label: 'retitle',
    call: 'items[0].title = …',
  },
  {
    key: 'items[0].done',
    action: 'toggleFirstDone',
    label: 'toggle',
    call: 'items[0].done = !done',
  },
];

/** What each beat plays on a loop until the reader moves on. */
const SCRIPTS: Record<string, Action[]> = {
  reader: ['changeEmail', 'rename'],
  proxy: ['rename', 'changeEmail'],
  conditional: ['changeEmail', 'rename'],
  leaves: ['replaceUser', 'replaceUser', 'rename'],
  lists: ['toggleFirstDone', 'retitleFirst', 'addItem'],
  play: [],
};

/** The email row is shown in these beats; in `conditional` it flips on a timer. */
const SHOW_EMAIL: Record<string, boolean | 'flip'> = {
  reader: false,
  proxy: true,
  conditional: 'flip',
  leaves: false,
  lists: false,
};

const SHOW_EVENT = 'stage:show-email';

function useRenders() {
  const n = useRef(0);
  n.current += 1;
  return n.current;
}

function Jack({
  id,
  spec,
  value,
  onFire,
}: {
  id: string;
  spec: (typeof JACKS)[number];
  value: string;
  onFire: () => void;
}) {
  const ref = useJack(spec.key);
  return (
    <div className="jack-row" data-key={spec.key}>
      <span className="jack-label">
        <span className="jack-path">{spec.key}</span>
        <span className="jack-value">{value}</span>
      </span>
      <button
        type="button"
        className="fire"
        onClick={onFire}
        aria-label={`Change ${spec.key}`}
        data-stage={id}
      >
        {spec.label}
      </button>
      <span className="socket" ref={ref} />
    </div>
  );
}

function Module({ id }: { id: string }) {
  const [s, profile] = useBloc(ProfileCubit, { args: { _id: id } });
  const values: Record<string, string> = {
    'user.name': `"${s.user.name}"`,
    'user.email': `"${s.user.email}"`,
    user: '{ name, email }',
    'items.length': String(s.items.length),
    'items[0].title': `"${s.items[0]?.title}"`,
    'items[0].done': String(s.items[0]?.done),
  };
  return (
    <section className="module" aria-label="ProfileCubit state">
      <header className="module-head">
        <span className="module-name">ProfileCubit</span>
        <span className="power kicker">live</span>
      </header>
      {JACKS.map((j) => (
        <Jack
          key={j.key}
          id={id}
          spec={j}
          value={values[j.key]!}
          onFire={profile[j.action]}
        />
      ))}
    </section>
  );
}

function Profile({ id }: { id: string }) {
  const [s] = useBloc(ProfileCubit, { args: { _id: id } });
  const [showEmail, setShowEmail] = useState(false);
  const renders = useRenders();

  useEffect(() => {
    const on = (e: Event) => setShowEmail((e as CustomEvent<boolean>).detail);
    document.addEventListener(SHOW_EVENT, on);
    return () => document.removeEventListener(SHOW_EVENT, on);
  }, []);

  // Exactly what this render reads from state, in order.
  const reads: Record<string, unknown> = { 'user.name': s.user.name };
  if (showEmail) reads['user.email'] = s.user.email;
  const { card, plug } = usePatch<HTMLElement>(`Profile-${id}`, reads);

  return (
    <article className="unit" ref={card}>
      <span className="unit-inputs" aria-hidden="true">
        {Object.keys(reads).map((k) => (
          <span key={k} className="unit-input" ref={plug(k)} />
        ))}
      </span>
      <p className="unit-name">
        &lt;Profile /&gt;{' '}
        <span className="renders">
          <span className="renders-word">renders </span>
          <b>{renders}</b>
        </span>
      </p>
      <div className="unit-body">
        <strong>{s.user.name}</strong>
        {showEmail && <span className="unit-sub">{s.user.email}</span>}
      </div>
      <label className="unit-toggle">
        <input
          type="checkbox"
          checked={showEmail}
          onChange={(e) => setShowEmail(e.target.checked)}
        />{' '}
        show email
      </label>
      <p className="tape">
        last render read{' '}
        {Object.keys(reads).map((k) => (
          <code key={k}>{k}</code>
        ))}
      </p>
    </article>
  );
}

function TodoList({ id }: { id: string }) {
  const [s] = useBloc(ProfileCubit, { args: { _id: id } });
  const renders = useRenders();
  const items = s.items;
  const reads: Record<string, unknown> = {
    'items.length': items.length,
    'items[0].title': items[0]?.title,
  };
  const { card, plug } = usePatch<HTMLElement>(`TodoList-${id}`, reads);
  return (
    <article className="unit" ref={card}>
      <span className="unit-inputs" aria-hidden="true">
        {Object.keys(reads).map((k) => (
          <span key={k} className="unit-input" ref={plug(k)} />
        ))}
      </span>
      <p className="unit-name">
        &lt;TodoList /&gt;{' '}
        <span className="renders">
          <span className="renders-word">renders </span>
          <b>{renders}</b>
        </span>
      </p>
      <ul className="unit-list">
        {items.map((t) => (
          <li key={t.title}>{t.title}</li>
        ))}
      </ul>
      <p className="tape">
        last render read <code>items.length</code>
        {items.map((_, i) => (
          <code key={i}>items[{i}].title</code>
        ))}
      </p>
    </article>
  );
}

/** Plays the active beat's script: one call every ~1.8 s, shown as the caption. */
function useScript(beat: string, id: string, setCaption: (c: string) => void) {
  const [, profile] = useBloc(ProfileCubit, { args: { _id: id } });
  useEffect(() => {
    const show = SHOW_EMAIL[beat];
    if (show !== undefined && show !== 'flip')
      document.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: show }));
    const script = SCRIPTS[beat] ?? [];
    if (
      !script.length ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setCaption(beat === 'play' ? 'Your turn: press any jack.' : '');
      return;
    }
    let i = 0;
    let flip = true;
    const tick = () => {
      if (show === 'flip' && i % script.length === 0) {
        document.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: flip }));
        setCaption(
          flip
            ? 'showEmail = true → next render reads user.email'
            : 'showEmail = false → it stops reading it',
        );
        flip = !flip;
        i += 0.5;
        return;
      }
      const action = script[Math.floor(i) % script.length]!;
      const spec = JACKS.find((j) => j.action === action)!;
      setCaption(`profile.${spec.call}`);
      profile[action]();
      i = Math.floor(i) + 1;
    };
    const timer = setInterval(tick, 1800);
    const first = setTimeout(tick, 500);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [beat, id, profile, setCaption]);
}

export default function TrackingStage() {
  const [beat, ref] = useBeat<HTMLDivElement>('play');
  const [caption, setCaption] = useState('');
  const id = useId();
  useScript(beat, id, setCaption);

  const stage = useMemo(
    () => (
      <>
        <Module id={id} />
        <div className="stage-units">
          <Profile id={id} />
          <TodoList id={id} />
        </div>
      </>
    ),
    [id],
  );

  return (
    <div ref={ref} className="stage" data-beat={beat}>
      <div className="stage-head kicker">
        <span className="stage-led" aria-hidden="true" />
        <span className="stage-caption" aria-live="polite">
          {caption || 'Real @blac/react, rendering live'}
        </span>
      </div>
      <PatchBay className="stage-bay">{stage}</PatchBay>
    </div>
  );
}
