import { createIndexedDbPersistPlugin } from '@blac/plugin-persist';
import {
  persistedDraftInitialState,
  PersistedDraftCubit,
  type PersistedDraftState,
} from './PersistedDraftCubit';

export const draftPersistPlugin = createIndexedDbPersistPlugin({
  databaseName: 'blac-examples',
  storeName: 'plugin-persist',
  pluginName: 'draft-persist-plugin',
}).persist<
  PersistedDraftState,
  { title: string; body: string; tags: string }
>(PersistedDraftCubit, {
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
});

export const DRAFT_INSTANCE_ID = 'demo-draft';
export const DRAFT_FULL_INSTANCE_ID = `${PersistedDraftCubit.name}:${DRAFT_INSTANCE_ID}`;
export const DRAFT_PERSIST_KEY = `examples:draft:${DRAFT_FULL_INSTANCE_ID}`;
