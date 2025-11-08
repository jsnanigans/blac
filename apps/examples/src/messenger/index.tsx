/**
 * BlaC Messenger Example
 *
 * A Slack-like messenger that demonstrates:
 * - Instance management (shared vs isolated instances)
 * - Fine-grained dependency tracking
 * - Event-driven architecture with Vertex
 * - WebSocket-like real-time updates
 * - Bloc-to-bloc communication patterns
 *
 * Architecture:
 * - AppCubit: Global app state (shared, single instance)
 * - ChannelBloc: Per-channel state (isolated instances)
 * - UserCubit: Per-user profile (shared instances)
 * - ContactsCubit: Contact/channel list (shared, single instance)
 * - WebSocketMock: Simulates real-time server
 */

export { MessengerApp } from './components/App';
