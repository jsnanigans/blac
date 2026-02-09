import { useBloc } from '@blac/react';
import { ActivityCubit } from '../ActivityCubit';
import { Button } from '../../../shared/components';

const sampleMessages = [
  'User signed up',
  'New order placed',
  'Payment received',
  'Item shipped',
  'Review submitted',
  'Subscription renewed',
  'Support ticket opened',
];

export function ActivityWidget() {
  const [state, bloc] = useBloc(ActivityCubit);

  const addSample = () => {
    const msg = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    bloc.addEntry(msg);
  };

  return (
    <div className="widget">
      <div className="flex-between">
        <h3>Activity Feed</h3>
        <Button variant="ghost" onClick={addSample} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
          + Add Entry
        </Button>
      </div>
      <div className="activity-feed">
        {state.entries.map((entry) => (
          <div key={entry.id} className="activity-entry">
            <span className="activity-time">{entry.time}</span>
            <span>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
