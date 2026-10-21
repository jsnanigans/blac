import { Cubit } from '@blac/core';
import { idle, mutation, resource, type AsyncState } from '@blac/async';
import { api, type Profile } from './api';

type UserArgs = { userId: string };

export class ProfileCubit extends Cubit<
  { profile: AsyncState<Profile>; rename: AsyncState<Profile> },
  UserArgs
> {
  static keepAlive = true;
  static key = (args?: UserArgs) => args?.userId ?? 'default';

  constructor() {
    super({ profile: idle(), rename: idle() });
  }

  profile = resource(
    this,
    'profile',
    (signal, { userId }) => api.getProfile(userId, signal),
    { auto: true, staleTime: 10_000, tags: ({ userId }) => ['user', userId] },
  );

  rename = mutation(
    this,
    'rename',
    (name: string, { userId }) => api.rename(userId, name),
    { invalidates: () => ['user'] },
  );
}

export class ActivityCubit extends Cubit<
  { activity: AsyncState<string[]> },
  UserArgs
> {
  static key = (args?: UserArgs) => args?.userId ?? 'default';

  constructor() {
    super({ activity: idle() });
  }

  activity = resource(
    this,
    'activity',
    (signal, { userId }) => api.getActivity(userId, signal),
    { auto: true, tags: ({ userId }) => ['user', userId] },
  );
}
