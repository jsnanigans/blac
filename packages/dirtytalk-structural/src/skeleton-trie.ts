import type { PathId } from './types';

type EqualsAt = (pathId: PathId, prev: unknown, next: unknown) => boolean;

interface TrieNode {
  readonly key: string;
  readonly parent: TrieNode | null;
  /** Skeleton ids whose path ends here (the root holds the root id). */
  readonly ids: PathId[];
  readonly children: TrieNode[];
  byKey: Map<string, TrieNode> | null;
  /** Position in `parent.children`, for O(1) removal. */
  slot: number;
}

const newNode = (key: string, parent: TrieNode | null): TrieNode => ({
  key,
  parent,
  ids: [],
  children: [],
  byKey: null,
  slot: 0,
});

const child = (node: TrieNode, key: string): TrieNode | undefined =>
  node.byKey?.get(key);

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
        node.children.push(next);
        (node.byKey ??= new Map()).set(key, next);
      }
      node = next;
    }
    node.ids.push(id);
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

const read = (v: unknown, key: string): unknown =>
  v !== null && typeof v === 'object'
    ? (v as Record<string, unknown>)[key]
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
    let pv = read(p, c.key);
    let nv = read(n, c.key);
    // Follow single-child chains (`a.b.c`) in a loop rather than recursing.
    while (
      c.ids.length === 0 &&
      c.children.length === 1 &&
      (pv !== nv || equalsAt !== undefined)
    ) {
      c = c.children[0];
      pv = read(pv, c.key);
      nv = read(nv, c.key);
    }
    // `===` misses only ±0 and NaN, which `addChanged` settles.
    if (c.ids.length !== 0) addChanged(c.ids, pv, nv, out, equalsAt);
    if (c.children.length !== 0 && (pv !== nv || equalsAt !== undefined)) {
      walk(c, pv, nv, out, equalsAt);
    }
  }
};
