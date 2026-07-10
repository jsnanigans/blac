import {
  render as litRender,
  nothing,
  type RenderOptions,
  type RootPart,
} from 'lit-html';

export interface MountHandle {
  unmount(): void;
}

type MountContainer = HTMLElement | DocumentFragment;
type RootKey = ChildNode | null;

const owners = new WeakMap<MountContainer, Map<RootKey, symbol>>();

function rootKey(options: RenderOptions | undefined): RootKey {
  return options?.renderBefore ?? null;
}

function owns(
  container: MountContainer,
  key: RootKey,
  owner: symbol,
): boolean {
  return owners.get(container)?.get(key) === owner;
}

function releaseOwner(container: MountContainer, key: RootKey, owner: symbol): void {
  const roots = owners.get(container);
  if (!roots || roots.get(key) !== owner) return;

  roots.delete(key);
  if (roots.size === 0) owners.delete(container);
}

/** Render a blac-lit renderable into a container. Returns an unmount handle. */
export function mount(
  value: unknown,
  container: MountContainer,
  options?: RenderOptions,
): MountHandle {
  // Keep the root selector stable even if callers later mutate their options.
  const renderOptions = options ? { ...options } : undefined;
  const key = rootKey(renderOptions);
  const owner = Symbol('blac-lit-mount');
  let roots = owners.get(container);
  if (!roots) {
    roots = new Map();
    owners.set(container, roots);
  }
  roots.set(key, owner);

  let part: RootPart;
  try {
    part = litRender(value, container, renderOptions);
  } catch (error) {
    releaseOwner(container, key, owner);
    throw error;
  }
  let unmounted = false;
  return {
    unmount() {
      if (unmounted) return;
      unmounted = true;

      // A subsequent mount into this Lit root owns the part. Its tree must not
      // be disconnected or cleared through an old handle.
      if (!owns(container, key, owner)) return;
      part.setConnected(false);
      if (!owns(container, key, owner)) return;

      litRender(nothing, container, renderOptions);
      releaseOwner(container, key, owner);
    },
  };
}
