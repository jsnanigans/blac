import { useBloc } from '@blac/react';
import { Button, RenderCounter } from '../../shared/components';
import { TrackingBloc } from './TrackingBloc';

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius-sm)',
        background: 'var(--color-surface)',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

export function TrackingControls() {
  const [state, bloc] = useBloc(TrackingBloc);

  return (
    <div
      style={{
        position: 'relative',
        padding: 10,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--border-radius)',
        background: 'var(--color-surface-hover)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <RenderCounter name="controls" />
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        <strong style={{ color: 'var(--color-text)' }}>Mutations.</strong> Click
        any button — only chips reading the touched path should tick.
      </div>

      <Group label="Top-level">
        <Button size="small" onClick={bloc.cycleColor}>
          color
        </Button>
        <Button size="small" onClick={bloc.toggleTheme}>
          theme
        </Button>
        <Button size="small" onClick={bloc.bumpVersion}>
          version+
        </Button>
        <Button size="small" variant="ghost" onClick={bloc.bumpUnrelated}>
          unrelated+ (no consumer)
        </Button>
      </Group>

      <Group label="user.* (nested object)">
        <Button size="small" onClick={() => bloc.setUserName(randName())}>
          name = random
        </Button>
        <Button size="small" onClick={() => bloc.setUserEmail(randEmail())}>
          email = random
        </Button>
        <Button size="small" onClick={bloc.cycleCity}>
          cycle city
        </Button>
        <Button size="small" variant="primary" onClick={bloc.swapAddress}>
          swap entire address obj
        </Button>
      </Group>

      <Group label="profile (nullable)">
        <Button
          size="small"
          variant="danger"
          onClick={bloc.clearProfile}
          disabled={!state.profile}
        >
          → null
        </Button>
        <Button
          size="small"
          variant="success"
          onClick={bloc.restoreProfile}
          disabled={!!state.profile}
        >
          → object
        </Button>
        <Button
          size="small"
          onClick={() => bloc.editProfileBio(randBio())}
          disabled={!state.profile}
        >
          bio = random
        </Button>
      </Group>

      <Group label="items[] (array)">
        <Button size="small" onClick={bloc.addItem}>
          push
        </Button>
        <Button size="small" variant="danger" onClick={bloc.removeLastItem}>
          pop
        </Button>
        <Button size="small" onClick={bloc.reorderItems}>
          reverse
        </Button>
        {state.items.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: 'inline-flex',
              gap: 4,
              padding: '2px 4px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-sm)',
            }}
          >
            <code style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              [{i}]
            </code>
            <Button
              size="small"
              onClick={() => bloc.appendItemTitle(item.id, '·')}
            >
              title+
            </Button>
            <Button
              size="small"
              variant={item.done ? 'success' : 'default'}
              onClick={() => bloc.toggleItem(item.id)}
            >
              {item.done ? '✓' : '○'}
            </Button>
          </div>
        ))}
      </Group>

      <Group label="matrix[][] (nested array)">
        <Button size="small" onClick={() => bloc.bumpMatrixCell(0, 0)}>
          [0][0]+
        </Button>
        <Button size="small" onClick={() => bloc.bumpMatrixCell(1, 1)}>
          [1][1]+
        </Button>
        <Button size="small" onClick={() => bloc.bumpMatrixCell(2, 3)}>
          [2][3]+
        </Button>
        <Button size="small" variant="ghost" onClick={bloc.resetMatrix}>
          reset
        </Button>
      </Group>

      <Group label="full">
        <Button size="small" variant="danger" onClick={bloc.reset}>
          emit fresh state
        </Button>
      </Group>
    </div>
  );
}

const NAMES = ['Ada', 'Grace', 'Linus', 'Margaret', 'Donald', 'Barbara'];
const DOMAINS = ['example.com', 'mail.dev', 'test.io', 'inbox.zone'];
const BIOS = [
  'Architects analytical engines.',
  'Tames runtime allocators.',
  'Writes deterministic state.',
  'Treats proxies kindly.',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randName = () => `${pick(NAMES)} ${pick(NAMES)}`;
const randEmail = () => `${pick(NAMES).toLowerCase()}@${pick(DOMAINS)}`;
const randBio = () => pick(BIOS);
