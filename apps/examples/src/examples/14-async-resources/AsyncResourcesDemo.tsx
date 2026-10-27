import { useState } from 'react';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import {
  Alert,
  Button,
  Card,
  Input,
  RenderCounter,
} from '../../shared/components';
import { USERS, flaky } from './api';
import { ActivityCubit, ProfileCubit } from './cubits';

function ProfileCard({ userId }: { userId: string }) {
  const [state, bloc] = useBloc(ProfileCubit, { args: { userId } });
  const [name, setName] = useState('');
  const { profile, rename } = state;

  return (
    <Card title="Profile">
      <div className="stack-sm" style={{ position: 'relative' }}>
        <RenderCounter name="ProfileCard" />
        <p className="text-small text-muted">
          status: <code>{profile.status}</code>
          {rename.status === 'loading' && ' · saving…'}
        </p>
        <h3>{profile.data?.name ?? '…'}</h3>
        {profile.status === 'error' && (
          <Alert variant="danger">
            {String((profile.error as Error).message)}{' '}
            <Button variant="ghost" onClick={() => void bloc.profile.reload()}>
              Retry
            </Button>
          </Alert>
        )}
        <Input
          label="New name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          variant="primary"
          disabled={!name || rename.status === 'loading'}
          onClick={() => void bloc.rename(name).then(() => setName(''))}
        >
          Rename
        </Button>
      </div>
    </Card>
  );
}

function ActivityCard({ userId }: { userId: string }) {
  const [state] = useBloc(ActivityCubit, { args: { userId } });
  const { activity } = state;

  return (
    <Card title="Activity">
      <div className="stack-sm" style={{ position: 'relative' }}>
        <RenderCounter name="ActivityCard" />
        <p className="text-small text-muted">
          status: <code>{activity.status}</code> — reloaded by the{' '}
          <code>{'user:<id>'}</code> tag when a rename succeeds
        </p>
        <ul>
          {activity.data?.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function AsyncResourcesDemo() {
  const [userId, setUserId] = useState(USERS[0]);

  return (
    <ExampleLayout
      title="Async Resources"
      description="Declare a slot, wrap the fetch in resource(), and let the container own loading, abort and refetch."
      features={[
        'resource() fills a status-union slot, aborts on release, and is latest-wins',
        'tags + invalidate(): a mutation reloads related resources in other cubits',
        'keepAlive profiles go stale while unused and reload on the next mount',
        'No mount effects: auto: true loads on activation',
      ]}
    >
      <section className="stack-lg">
        <div className="flex gap-sm">
          {USERS.map((id) => (
            <Button
              key={id}
              variant={id === userId ? 'primary' : 'ghost'}
              onClick={() => setUserId(id)}
            >
              {id}
            </Button>
          ))}
          <Button variant="danger" onClick={() => (flaky.failNext = true)}>
            Fail next request
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-md">
          <ProfileCard userId={userId} />
          <ActivityCard userId={userId} />
        </div>
      </section>
    </ExampleLayout>
  );
}
