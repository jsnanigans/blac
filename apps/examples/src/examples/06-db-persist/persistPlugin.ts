import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import { Cubit } from '@blac/core';
import {
  persistedDraftInitialState,
  PersistedDraftCubit,
  type PersistedDraftState,
} from './PersistedDraftCubit';

export const draftPersistPlugin = createIndexedDbPersistPlugin({
  databaseName: 'blac-examples',
  storeName: 'plugin-persist',
  pluginName: 'draft-persist-plugin',
}).persist<PersistedDraftState, { title: string; body: string; tags: string }>(
  // Cast needed: plugin-persist's persist() types Cubit<S> (no args),
  // but PersistedDraftCubit is Cubit<S, PersistedDraftArgs>. The runtime
  // behaviour is unchanged; only identity-key derivation differs.
  PersistedDraftCubit as unknown as new (
    ...args: unknown[]
  ) => Cubit<PersistedDraftState>,
  {
    key: ({ instanceId }) => `examples:draft:${instanceId}`,
    debounceMs: 120,
    stateToDb: (state) => ({
      title: state.title,
      body: state.body,
      tags: state.tags.join(','),
    }),
    dbToState: (payload, ctx) => {
      const parsed = typeof payload === 'object' && payload ? payload : {};
      const title =
        typeof (parsed as { title?: unknown }).title === 'string'
          ? (parsed as { title: string }).title
          : ctx.currentState.title;
      const body =
        typeof (parsed as { body?: unknown }).body === 'string'
          ? (parsed as { body: string }).body
          : ctx.currentState.body;
      const tagsValue = (parsed as { tags?: unknown }).tags;
      const tags =
        typeof tagsValue === 'string'
          ? tagsValue
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : ctx.currentState.tags;

      return {
        ...persistedDraftInitialState,
        title,
        body,
        tags,
      };
    },
  },
);

export const DRAFT_INSTANCE_ID = 'demo-draft';
// Instance identity comes from args, so the resolved key = key(args) = args.id.
export const DRAFT_PERSIST_KEY = `examples:draft:${DRAFT_INSTANCE_ID}`;
