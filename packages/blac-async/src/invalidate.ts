import { getRegistry, type StateContainerRegistry } from '@blac/core';

export interface Invalidatable {
  /** Reload if active or already loaded; otherwise mark stale for next activation. */
  invalidate(): void;
}

const indexes = new WeakMap<
  StateContainerRegistry,
  Map<string, Set<Invalidatable>>
>();

export function indexTags(
  registry: StateContainerRegistry,
  tags: readonly string[],
  entry: Invalidatable,
): () => void {
  let index = indexes.get(registry);
  if (!index) indexes.set(registry, (index = new Map()));
  for (const tag of tags) {
    let entries = index.get(tag);
    if (!entries) index.set(tag, (entries = new Set()));
    entries.add(entry);
  }
  return () => {
    for (const tag of tags) index.get(tag)?.delete(entry);
  };
}

/** Reloads every resource tagged with `tag`; defaults to the global registry. */
export function invalidate(
  tags: string | readonly string[],
  registry: StateContainerRegistry = getRegistry(),
): void {
  const index = indexes.get(registry);
  if (!index) return;
  const matches = new Set<Invalidatable>();
  for (const tag of typeof tags === 'string' ? [tags] : tags) {
    for (const entry of index.get(tag) ?? []) matches.add(entry);
  }
  for (const entry of matches) entry.invalidate();
}
