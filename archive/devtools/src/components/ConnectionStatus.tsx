interface ConnectionStatusProps {
  isConnected: boolean;
}

function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div
      className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}
    >
      <span className="status-dot"></span>
      <span className="status-text">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

export default ConnectionStatus;
