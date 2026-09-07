import { useBloc } from '@blac/react';
import { UserCardCubit } from './UserCardCubit';

interface UserCardProps {
  userId: string;
  label?: string;
}

/**
 * Renders a user card keyed by userId via args.
 * Multiple <UserCard userId="alice" /> mounts share the same cubit instance
 * and therefore share all state (likes, online status).
 */
export function UserCard({ userId, label }: UserCardProps) {
  const [state, cubit] = useBloc(UserCardCubit, {
    args: { userId },
  });

  return (
    <div className="card stack-sm">
      {label && (
        <span className="text-small text-muted" style={{ fontStyle: 'italic' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: state.online ? '#22c55e' : '#6b7280',
            display: 'inline-block',
            flexShrink: 0,
          }}
          title={state.online ? 'Online' : 'Offline'}
        />
        <strong>{state.displayName}</strong>
        <span className="text-small text-muted">({state.userId})</span>
      </div>
      <div className="text-small text-muted">
        Likes: <strong>{state.likes}</strong>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="ghost" onClick={cubit.like}>
          Like +1
        </button>
        <button className="ghost" onClick={cubit.toggleOnline}>
          Toggle online
        </button>
      </div>
    </div>
  );
}
