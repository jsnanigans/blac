export interface SerializedEvent {
  id: string;
  blocId: string;
  blocName: string;
  type: string;
  payload: any;
  timestamp: number;
}

export interface BlocCreatedPayload {
  id: string;
  name: string;
  state: any;
  timestamp: number;
}

export interface StateChangedPayload {
  blocId: string;
  state: any;
  diff?: any;
  timestamp: number;
}

export interface BlocDisposedPayload {
  id: string;
  name: string;
  timestamp: number;
}

export interface HeartbeatPayload {
  timestamp: number;
  connectedSince: number;
}

export interface ReconnectedPayload {
  timestamp: number;
  requestStateSync: boolean;
}

export type DevToolsMessage =
  | {
      type: 'BLOC_CREATED';
      payload: BlocCreatedPayload;
    }
  | {
      type: 'EVENT_DISPATCHED';
      payload: SerializedEvent;
    }
  | {
      type: 'STATE_CHANGED';
      payload: StateChangedPayload;
    }
  | {
      type: 'BLOC_DISPOSED';
      payload: BlocDisposedPayload;
    }
  | {
      type: 'HEARTBEAT';
      payload: HeartbeatPayload;
    }
  | {
      type: 'RECONNECTED';
      payload: ReconnectedPayload;
    };

export type DevToolsCommand =
  | {
      type: 'TIME_TRAVEL';
      payload: { eventIndex: number };
    }
  | {
      type: 'REQUEST_STATE';
      payload: { blocId: string };
    }
  | {
      type: 'CLEAR_EVENTS';
    }
  | {
      type: 'HEARTBEAT_ACK';
    };

export interface WindowMessage {
  source: 'blac-devtools-app' | 'blac-devtools-extension';
  payload: DevToolsMessage | DevToolsCommand;
}
