# @blac/async

Async resources and mutations for BlaC containers: a status slot in state, abort on release, latest-wins calls, tag-based invalidation and global error hooks.

**[Documentation](https://blac-docs.pages.dev/guide/async-resources)**

> [!WARNING]
> **BlaC v2 is in pre-release (beta).** While in beta, **breaking API changes may
> ship in patch releases** without a major version bump. Pin an exact version and
> check the changelog before upgrading.

## Installation

```bash
pnpm add @blac/async
```

## Quick Start

```ts
import { Cubit } from '@blac/core';
import { idle, resource, type AsyncState } from '@blac/async';

class ProfileCubit extends Cubit<
  { profile: AsyncState<Profile> },
  { userId: string }
> {
  constructor() {
    super({ profile: idle() });
  }

  profile = resource(
    this,
    'profile',
    (signal, { userId }) => api.getProfile(userId, signal),
    { auto: true, tags: ({ userId }) => ['user', `user:${userId}`] },
  );
}
```
