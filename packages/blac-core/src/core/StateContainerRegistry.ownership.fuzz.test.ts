import { describe, it, beforeEach, afterEach } from 'vite-plus/test';
import { StateContainer } from './StateContainer';
import { globalRegistry } from './StateContainerRegistry';

class Keyed extends StateContainer<{ n: number }, { id?: string }> {
  constructor() {
    super({ n: 0 });
  }
  static key = (a?: { id?: string }) => a?.id ?? 'default';
}

class Plain extends StateContainer<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

class Sticky extends StateContainer<{ n: number }> {
  static keepAlive = true;
  constructor() {
    super({ n: 0 });
  }
}

class Owner extends StateContainer<{ ok: boolean }> {
  constructor() {
    super({ ok: true });
  }
  private keyedDep = this.depend(Keyed);
  private plainDep = this.depend(Plain);
  private stickyDep = this.depend(Sticky);
  readKeyed = (id?: string) =>
    this.keyedDep.untracked(id ? { args: { id } } : undefined);
  readPlain = () => this.plainDep.untracked();
  readSticky = () => this.stickyDep.untracked();
}

const TYPES = [Keyed, Plain, Sticky] as const;
const KEYS = ['a', 'b'];
const REF_IDS = ['r0', 'r1', 'r2'];

type ShadowType = (typeof TYPES)[number] | typeof Owner;

function makeRng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

type Op =
  | { kind: 'acquire'; Type: ShadowType; key: string; refId: string }
  | { kind: 'release'; Type: ShadowType; key: string; refId?: string }
  | { kind: 'forceDispose'; Type: ShadowType; key: string }
  | { kind: 'depend'; ownerType: 'Keyed' | 'Plain' | 'Sticky'; key?: string }
  | { kind: 'disposeOwner' };

function genOp(rng: () => number): Op {
  const roll = rng();
  const Type = pick(rng, TYPES);
  const key = Type === Plain || Type === Sticky ? 'default' : pick(rng, KEYS);
  const refId = pick(rng, REF_IDS);

  if (roll < 0.3) return { kind: 'acquire', Type, key, refId };
  if (roll < 0.5) return { kind: 'release', Type, key, refId };
  if (roll < 0.6) return { kind: 'release', Type, key, refId: undefined };
  if (roll < 0.7) return { kind: 'forceDispose', Type, key };
  if (roll < 0.9) {
    const ownerType = pick(rng, ['Keyed', 'Plain', 'Sticky'] as const);
    return {
      kind: 'depend',
      ownerType,
      key: ownerType === 'Keyed' ? pick(rng, KEYS) : undefined,
    };
  }
  return { kind: 'disposeOwner' };
}

function formatOp(op: Op): string {
  switch (op.kind) {
    case 'acquire':
      return `acquire(${op.Type.name}, "${op.key}", refId="${op.refId}")`;
    case 'release':
      return `release(${op.Type.name}, "${op.key}", refId=${op.refId ?? 'undefined'})`;
    case 'forceDispose':
      return `forceDispose(${op.Type.name}, "${op.key}")`;
    case 'depend':
      return `depend(owner=${op.ownerType}, key=${op.key ?? 'default'})`;
    case 'disposeOwner':
      return 'disposeOwner()';
  }
}

interface ShadowEntry {
  refs: Map<string, number>;
  dependentCount: number;
}

class ShadowModel {
  entries = new Map<string, ShadowEntry>();

  private key(Type: ShadowType, key: string): string {
    return `${Type.name}:${key}`;
  }

  private ensure(Type: ShadowType, key: string): ShadowEntry {
    const k = this.key(Type, key);
    let entry = this.entries.get(k);
    if (!entry) {
      entry = { refs: new Map(), dependentCount: 0 };
      this.entries.set(k, entry);
    }
    return entry;
  }

  acquire(Type: ShadowType, key: string, refId: string): void {
    const entry = this.ensure(Type, key);
    entry.refs.set(refId, (entry.refs.get(refId) ?? 0) + 1);
  }

  depend(Type: ShadowType, key: string): void {
    this.ensure(Type, key).dependentCount++;
  }

  private isUnowned(Type: ShadowType, entry: ShadowEntry): boolean {
    return (
      entry.refs.size === 0 && entry.dependentCount === 0 && Type !== Sticky
    );
  }

  release(Type: ShadowType, key: string, refId?: string): void {
    const k = this.key(Type, key);
    const entry = this.entries.get(k);
    if (!entry) return;

    const targetRefId = refId ?? entry.refs.keys().next().value;
    if (targetRefId !== undefined) {
      const count = entry.refs.get(targetRefId) ?? 0;
      if (count <= 1) entry.refs.delete(targetRefId);
      else entry.refs.set(targetRefId, count - 1);
    }

    if (this.isUnowned(Type, entry)) this.entries.delete(k);
  }

  forceDispose(Type: ShadowType, key: string): void {
    this.entries.delete(this.key(Type, key));
  }

  releaseDependent(Type: ShadowType, key: string): void {
    const k = this.key(Type, key);
    const entry = this.entries.get(k);
    if (!entry) return;
    entry.dependentCount = Math.max(0, entry.dependentCount - 1);
    if (this.isUnowned(Type, entry)) this.entries.delete(k);
  }

  disposeAll(): void {
    this.entries.clear();
  }

  refCount(Type: ShadowType, key: string): number {
    return this.entries.get(this.key(Type, key))?.refs.size ?? 0;
  }

  isLive(Type: ShadowType, key: string): boolean {
    return this.entries.has(this.key(Type, key));
  }
}

const reset = () => globalRegistry.clearAll();

describe('registry ownership fuzz', () => {
  beforeEach(reset);
  afterEach(reset);

  const SEEDS = 200;
  const OPS_PER_SEED = 40;

  for (let seed = 1; seed <= SEEDS; seed++) {
    it(`seed ${seed}`, () => {
      const rng = makeRng(seed);
      const shadow = new ShadowModel();
      const log: string[] = [];
      let owner: InstanceType<typeof Owner> | null = null;
      const dependEdges: Array<{ Type: ShadowType; key: string }> = [];

      const fail = (message: string): never => {
        throw new Error(`${message}\nseed=${seed}\nops:\n${log.join('\n')}`);
      };

      const checkInvariants = () => {
        for (const Type of TYPES) {
          const instances = globalRegistry.getInstancesMap(Type);
          for (const [key, entry] of instances) {
            if (entry.instance.$blac.disposed) {
              fail(
                `stale entry: ${Type.name}:"${key}" is disposed but still reachable`,
              );
            }
            const hasRefs = entry.refs.size > 0;
            const hasDependents = (entry.dependents?.size ?? 0) > 0;
            if (!shadow.isLive(Type, key) && (hasRefs || hasDependents)) {
              fail(
                `shadow model expected ${Type.name}:"${key}" to be gone, ` +
                  `but registry still holds refs=${entry.refs.size} dependents=${entry.dependents?.size ?? 0}`,
              );
            }
          }

          for (const key of KEYS.concat('default')) {
            const liveInRegistry = instances.has(key);
            const liveInShadow = shadow.isLive(Type, key);
            if (liveInRegistry !== liveInShadow) {
              fail(
                `liveness mismatch for ${Type.name}:"${key}": ` +
                  `registry=${liveInRegistry} shadow=${liveInShadow}`,
              );
            }
            if (liveInRegistry) {
              const actualRefCount = globalRegistry.getRefCount(Type, key);
              const expectedRefCount = shadow.refCount(Type, key);
              if (actualRefCount !== expectedRefCount) {
                fail(
                  `refCount mismatch for ${Type.name}:"${key}": ` +
                    `registry=${actualRefCount} shadow=${expectedRefCount}`,
                );
              }
            }
          }
        }
      };

      for (let i = 0; i < OPS_PER_SEED; i++) {
        const op = genOp(rng);
        log.push(formatOp(op));

        try {
          switch (op.kind) {
            case 'acquire':
              globalRegistry.acquire(op.Type, op.key, { refId: op.refId });
              shadow.acquire(op.Type, op.key, op.refId);
              break;

            case 'release':
              globalRegistry.release(op.Type, op.key, false, op.refId);
              shadow.release(op.Type, op.key, op.refId);
              break;

            case 'forceDispose':
              globalRegistry.release(op.Type, op.key, true);
              shadow.forceDispose(op.Type, op.key);
              // forceDispose deletes the entry outright; any recorded
              // depend() edge onto it becomes stale, not a live dependent.
              for (let j = dependEdges.length - 1; j >= 0; j--) {
                if (
                  dependEdges[j].Type === op.Type &&
                  dependEdges[j].key === op.key
                ) {
                  dependEdges.splice(j, 1);
                }
              }
              break;

            case 'depend': {
              if (!owner) {
                owner = globalRegistry.acquire(Owner, 'owner', {
                  refId: 'owner-ref',
                });
                shadow.acquire(Owner, 'owner', 'owner-ref');
              }
              if (owner.$blac.disposed) break;

              let Type: ShadowType;
              let key: string;
              if (op.ownerType === 'Keyed') {
                owner.readKeyed(op.key);
                Type = Keyed;
                key = op.key ?? 'default';
              } else if (op.ownerType === 'Plain') {
                owner.readPlain();
                Type = Plain;
                key = 'default';
              } else {
                owner.readSticky();
                Type = Sticky;
                key = 'default';
              }
              const alreadyEdged = dependEdges.some(
                (e) => e.Type === Type && e.key === key,
              );
              if (!alreadyEdged) {
                dependEdges.push({ Type, key });
                shadow.depend(Type, key);
              }
              break;
            }

            case 'disposeOwner':
              if (owner && !owner.$blac.disposed) {
                owner.dispose();
                shadow.release(Owner, 'owner', 'owner-ref');
                for (const e of dependEdges) {
                  shadow.releaseDependent(e.Type, e.key);
                }
                dependEdges.length = 0;
              }
              break;
          }
        } catch (error) {
          fail(`unexpected throw: ${(error as Error).message}`);
        }

        checkInvariants();
      }
    });
  }
});
