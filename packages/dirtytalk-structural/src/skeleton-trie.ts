import type { PathId } from './types';

type EqualsAt = (pathId: PathId, prev: unknown, next: unknown) => boolean;

interface TrieNode {
  readonly key: string;
  /** `key` as an index when it is one: indexing an array by number skips
   * the string-to-index conversion. */
  readonly readKey: string | number;
  readonly parent: TrieNode | null;
  /** Skeleton ids whose path ends here (the root holds the root id). */
  ids: PathId[];
  children: TrieNode[];
  /** Built once `children` outgrows a linear scan. */
  byKey: Map<string, TrieNode> | null;
  /** Position in `parent.children`, for O(1) removal. */
  slot: number;
}

const INDEX = /^(?:0|[1-9]\d{0,8})$/;

// Shared until the first add. Small arrays grow by `concat`, which allocates
// the exact length: a push onto `[]` reserves 17 slots, and most nodes hold
// one id or a few children.
const NONE: never[] = [];

const newNode = (key: string, parent: TrieNode | null): TrieNode => ({
  key,
  readKey: INDEX.test(key) ? Number(key) : key,
  parent,
  ids: NONE,
  children: NONE,
  byKey: null,
  slot: 0,
});

const SCAN_LIMIT = 8;

const child = (node: TrieNode, key: string): TrieNode | undefined => {
  if (node.byKey !== null) return node.byKey.get(key);
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i].key === key) return children[i];
  }
  return undefined;
};

/**
 * The consumer skeleton as a path trie, so a diff walks prev/next once from
 * the root and skips every subtree whose reference is unchanged. Replacing one
 * item of an N-item list compares N item references and descends into one,
 * instead of walking every skeleton path from the root.
 */
export class SkeletonTrie {
  private readonly _root = newNode('', null);

  add(id: PathId, segments: readonly string[]): void {
    let node = this._root;
    for (const key of segments) {
      let next = child(node, key);
      if (next === undefined) {
        next = newNode(key, node);
        next.slot = node.children.length;
        node.children =
          node.children.length < SCAN_LIMIT
            ? node.children.concat(next)
            : (node.children.push(next), node.children);
        if (node.byKey !== null) {
          node.byKey.set(key, next);
        } else if (node.children.length > SCAN_LIMIT) {
          node.byKey = new Map(node.children.map((c) => [c.key, c]));
        }
      }
      node = next;
    }
    node.ids = node.ids.concat(id);
  }

  remove(id: PathId, segments: readonly string[]): void {
    let node: TrieNode | undefined = this._root;
    for (const key of segments) {
      node = child(node, key);
      if (node === undefined) return;
    }
    const at = node.ids.indexOf(id);
    if (at === -1) return;
    node.ids.splice(at, 1);
    // Prune nodes left with no ids and no children.
    while (
      node.parent !== null &&
      node.ids.length === 0 &&
      node.children.length === 0
    ) {
      const parent: TrieNode = node.parent;
      const last = parent.children.pop();
      if (last !== undefined && last !== node) {
        last.slot = node.slot;
        parent.children[node.slot] = last;
      }
      parent.byKey?.delete(node.key);
      node = parent;
    }
  }

  /** Every skeleton id whose value differs between `prev` and `next`. */
  diff(
    prev: unknown,
    next: unknown,
    out: Set<PathId>,
    equalsAt?: EqualsAt,
  ): void {
    const root = this._root;
    addChanged(root.ids, prev, next, out, equalsAt);
    if (prev !== next || equalsAt !== undefined) {
      walk(root, prev, next, out, equalsAt);
    }
  }

  /**
   * Skeleton ids strictly below `segments` whose value differs, given the
   * values at `segments` in prev and next.
   */
  diffBelow(
    segments: readonly string[],
    prev: unknown,
    next: unknown,
    out: Set<PathId>,
    equalsAt?: EqualsAt,
  ): void {
    let node: TrieNode | undefined = this._root;
    for (const key of segments) {
      node = child(node, key);
      if (node === undefined) return;
    }
    walk(node, prev, next, out, equalsAt);
  }
}

const addChanged = (
  ids: PathId[],
  p: unknown,
  n: unknown,
  out: Set<PathId>,
  equalsAt: EqualsAt | undefined,
): void => {
  for (let i = 0; i < ids.length; i++) {
    const changed =
      equalsAt === undefined ? !Object.is(p, n) : !equalsAt(ids[i], p, n);
    if (changed) out.add(ids[i]);
  }
};

const read = (v: unknown, key: string | number): unknown =>
  v !== null && typeof v === 'object'
    ? (v as Record<string | number, unknown>)[key]
    : undefined;

// Mirrors `changedAt`: a shared reference ends the walk unless a custom
// equality must see every read.
const walk = (
  node: TrieNode,
  p: unknown,
  n: unknown,
  out: Set<PathId>,
  equalsAt: EqualsAt | undefined,
): void => {
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    let c = children[i];
    let pv = read(p, c.readKey);
    let nv = read(n, c.readKey);
    // Follow single-child chains (`a.b.c`) in a loop rather than recursing.
    while (
      c.ids.length === 0 &&
      c.children.length === 1 &&
      (pv !== nv || equalsAt !== undefined)
    ) {
      c = c.children[0];
      pv = read(pv, c.readKey);
      nv = read(nv, c.readKey);
    }
    // `===` misses only ±0 and NaN, which `addChanged` settles.
    if (c.ids.length !== 0) addChanged(c.ids, pv, nv, out, equalsAt);
    if (c.children.length !== 0 && (pv !== nv || equalsAt !== undefined)) {
      walk(c, pv, nv, out, equalsAt);
    }
  }
};
