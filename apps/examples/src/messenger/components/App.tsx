import { useBloc } from '@blac/react';
import { useEffect } from 'react';
import { AppCubit } from '../blocs/AppCubit';
import { Sidebar } from './Sidebar';
import { ChannelView } from './ChannelView';
import { webSocket } from '../services/WebSocketMock';
import { CURRENT_USER_ID } from '../mockData';

/**
 * Main App component for the messenger
 *
 * Demonstrates:
 * - Initialization of all Blocs with proper instance management
 * - WebSocket integration
 * - Clean separation of concerns
 */
export function MessengerApp() {
  const [appState, { setCurrentUserId: setUserId }] = useBloc(AppCubit);

  // Set current user ID in AppCubit
  useEffect(() => {
    setUserId({ currentUserId: CURRENT_USER_ID });
  }, [setUserId]);

  // Connect to WebSocket
  useEffect(() => {
    webSocket.connect(CURRENT_USER_ID);

    // Handle incoming messages
    const unsubscribe = webSocket.onMessage((_msg) => {
      // Messages are handled directly by ChannelBloc through WebSocketMock
    });

    return () => {
      unsubscribe();
      webSocket.disconnect();
    };
  }, []);

  return (
    <div className="messenger-app">
      <Sidebar currentUserId={CURRENT_USER_ID} />

      <div className="main-content">
        {appState.activeChannelId ? (
          <ChannelView
            channelId={appState.activeChannelId}
            currentUserId={CURRENT_USER_ID}
          />
        ) : (
          <div className="no-channel-selected">
            <h2>Welcome to BlaC Messenger</h2>
            <p>Select a channel from the sidebar to start chatting</p>
            <div className="demo-info">
              <h3>What to watch for:</h3>
              <ul>
                <li>
                  Each channel has its own independent state (ChannelBloc)
                </li>
                <li>
                  Components only re-render when their specific data changes
                </li>
                <li>
                  Bots will randomly send messages and show typing indicators
                </li>
                <li>
                  Open DevTools (Alt+D) to see instance management in action
                </li>
              </ul>
            </div>

            <details className="patterns-panel" style={{ marginTop: '24px' }}>
              <summary>BlaC Patterns Used</summary>
              <div className="pattern-list">
                <div className="pattern-item">
                  <span>
                    <code>instanceKey</code> &mdash; Each channel gets its own
                    ChannelBloc instance, keyed by channel ID
                  </span>
                </div>
                <div className="pattern-item">
                  <span>
                    <code>acquire / borrow / borrowSafe</code> &mdash;
                    Components acquire shared instances and borrow references
                    across the tree
                  </span>
                </div>
                <div className="pattern-item">
                  <span>
                    <code>depend()</code> &mdash; ChannelBloc depends on
                    AppCubit for current user context
                  </span>
                </div>
                <div className="pattern-item">
                  <span>
                    <code>onSystemEvent('dispose')</code> &mdash; Persistence
                    hooks save channel state before disposal
                  </span>
                </div>
                <div className="pattern-item">
                  <span>
                    <code>NotificationCubit</code> &mdash; Lightweight proxy
                    cubit that aggregates unread counts from all channels
                  </span>
                </div>
                <div className="pattern-item">
                  <span>
                    <code>Lazy creation</code> &mdash; UserCubit instances are
                    created on demand when a user profile is first needed
                  </span>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
