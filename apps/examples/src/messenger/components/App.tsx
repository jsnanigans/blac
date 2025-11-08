import { useBloc } from '@blac/react';
import { useEffect, useMemo } from 'react';
import { AppCubit } from '../blocs/AppCubit';
import { ContactsCubit } from '../blocs/ContactsCubit';
import { UserCubit } from '../blocs/UserCubit';
import { ChannelBloc, ReceiveMessageEvent } from '../blocs/ChannelBloc';
import { Sidebar } from './Sidebar';
import { ChannelView } from './ChannelView';
import { webSocket } from '../services/WebSocketMock';
import {
  CURRENT_USER_ID,
  MOCK_USERS,
  MOCK_CHANNELS,
  getWelcomeMessages,
} from '../mockData';

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
    staticProps: { currentUserId: CURRENT_USER_ID },
  });
  const [contacts] = useBloc(ContactsCubit);

  // Initialize all user instances BEFORE first render (shared instances)
  // Using useMemo with empty deps to run only once before render
  useMemo(() => {
    MOCK_USERS.forEach((user) => {
      UserCubit.resolve(user.id, { user });
    });
  }, []);

  // Clean up user instances on unmount
  useEffect(() => {
    return () => {
      MOCK_USERS.forEach((user) => {
        UserCubit.release(user.id);
      });
    };
  }, []);

  // Initialize channel instances with welcome messages
  useEffect(() => {
    MOCK_CHANNELS.forEach((channel) => {
      const channelBloc = ChannelBloc.resolve(channel.id, { channel });

      // Add welcome messages
      const welcomeMessages = getWelcomeMessages(channel.id);
      welcomeMessages.forEach((message) => {
        channelBloc.add(new ReceiveMessageEvent(message));
      });
    });

    // Set first channel as active
    if (contacts.channels.length > 0 && !appState.activeChannelId) {
      const firstChannel = contacts.channels[0];
      AppCubit.get().setActiveChannel(firstChannel.id);
    }

    return () => {
      // Clean up channel instances when app unmounts
      MOCK_CHANNELS.forEach((channel) => {
        ChannelBloc.release(channel.id);
      });
    };
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    webSocket.connect(CURRENT_USER_ID);

    // Handle incoming messages
    const unsubscribe = webSocket.onMessage((msg) => {
      console.log('[App] Received message:', msg);
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
