import type { SerializedEvent } from '@blac/devtools-connect';

interface EventLogProps {
  events: SerializedEvent[];
}

function EventLog({ events }: EventLogProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className="event-log">
      {events.length === 0 ? (
        <div className="empty-message">
          <p>No events yet</p>
          <p className="hint">Events will appear here as they're dispatched</p>
        </div>
      ) : (
        <table className="event-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Bloc</th>
              <th>Event</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td className="time">{formatTime(event.timestamp)}</td>
                <td className="bloc-name">{event.blocName}</td>
                <td className="event-type">{event.type}</td>
                <td className="payload">
                  <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EventLog;
