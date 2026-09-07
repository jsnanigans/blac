import { Cubit } from '@blac/core';

export interface PersistedDraftState {
  title: string;
  body: string;
  tags: string[];
  localEditCount: number;
}

export type PersistedDraftArgs = { id: string };

export const persistedDraftInitialState: PersistedDraftState = {
  title: 'IndexedDB Draft',
  body: '',
  tags: ['blac', 'plugin'],
  localEditCount: 0,
};

export class PersistedDraftCubit extends Cubit<
  PersistedDraftState,
  PersistedDraftArgs
> {
  static key = (a: PersistedDraftArgs) => a.id;

  constructor() {
    super(persistedDraftInitialState);
  }

  setTitle = (title: string) => {
    this.patch({
      title,
      localEditCount: this.state.localEditCount + 1,
    });
  };

  setBody = (body: string) => {
    this.patch({
      body,
      localEditCount: this.state.localEditCount + 1,
    });
  };

  setTags = (tags: string[]) => {
    this.patch({
      tags,
      localEditCount: this.state.localEditCount + 1,
    });
  };

  resetDraft = () => {
    this.emit({
      ...persistedDraftInitialState,
      title: 'IndexedDB Draft',
    });
  };
}
