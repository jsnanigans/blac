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
  const [appState] = useBloc(AppCubit, {
    props: { currentUserId: CURRENT_USER_ID },
  });

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
                  🚀 Each channel has its own isolated state (ChannelBloc)
                </li>
                <li>
                  ⚡ Components only re-render when their specific data changes
                </li>
                <li>
                  🤖 Bots will randomly send messages and show typing indicators
                </li>
                <li>
                  📊 Open DevTools (Alt+D) to see instance management in action
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
