export const PROTOCOL_VERSION = 1;

declare const __BLAC_CONNECT_VERSION__: string | undefined;

/**
 * This `@blac/devtools-connect` package version, injected at build time;
 * `'dev'` when built from source.
 */
export const CONNECT_VERSION: string =
  typeof __BLAC_CONNECT_VERSION__ === 'string'
    ? __BLAC_CONNECT_VERSION__
    : 'dev';

/** `window.postMessage` envelope tags used by the page <-> content-script hop. */
export const WINDOW_AGENT_SOURCE = 'blac-devtools-agent';
export const WINDOW_CLIENT_SOURCE = 'blac-devtools-client';

/** Where the agent publishes its in-page endpoint (see `AgentHook`). */
export const AGENT_HOOK = Symbol.for('blac.devtools');

/**
 * JSON-safe serialized value. Non-JSON values are tagged objects
 * (`{ __type: 'Map' | 'Set' | 'Date' | 'Error' | 'Circular' | 'Truncated' | … }`).
 */
export type Wire =
  | null
  | boolean
  | number
  | string
  | Wire[]
  | { [key: string]: Wire };

/** Decoded dotted paths that changed; `'all'` when the change spans everything. */
export type Paths = string[] | 'all';

export interface InstanceMeta {
  id: string;
  className: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Number of recorded changes since creation. */
  version: number;
  args?: Wire;
}

export interface HistoryEntry {
  version: number;
  at: number;
  paths: Paths;
  state: Wire;
}

export type ClientMsg =
  | { t: 'hello'; protocol: number }
  /** Stream new history entries of this instance (one at a time). */
  | { t: 'watch'; id: string | null }
  | { t: 'history'; id: string }
  | { t: 'snapshot' }
  | { t: 'bye' };

interface Sequenced {
  session: string;
  seq: number;
}

/**
 * `welcome` keeps this exact shape across protocol versions so a client can
 * always report a version mismatch.
 */
export type AgentMsg =
  | { t: 'ready'; protocol: number }
  | { t: 'bye' }
  | (Sequenced & {
      t: 'welcome';
      protocol: number;
      /** `CONNECT_VERSION`; missing from agents before 2.0.26. */
      version?: string;
      instances: InstanceMeta[];
    })
  | (Sequenced & { t: 'snapshot'; instances: InstanceMeta[] })
  | (Sequenced & { t: 'created'; meta: InstanceMeta })
  | (Sequenced & {
      t: 'changed';
      id: string;
      version: number;
      at: number;
      /** Union of the paths of every change since the last `changed`. */
      paths: Paths;
    })
  | (Sequenced & { t: 'disposed'; id: string; at: number })
  /** Sent only by older agents, which kept disposed instances listed. */
  | (Sequenced & { t: 'removed'; id: string })
  /**
   * Recorded changes, oldest first: the whole ring in reply to `history`,
   * then each new change of the watched instance.
   */
  | (Sequenced & { t: 'history'; id: string; entries: HistoryEntry[] });

export type SequencedAgentMsg = Extract<AgentMsg, { seq: number }>;

export function isTagged(value: Wire | undefined): value is {
  __type: string;
  [key: string]: Wire;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.__type === 'string'
  );
}
