# BlaC Dependency Tracking - Visual Flowcharts and Diagrams

## 1. Hook Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      useBloc() Called                       │
└─────────────────────────────────────────────────────────────┘
                             ↓
                    options provided?
                             ↓
    ┌────────────────────────┬────────────────────────┐
    │                        │                        │
 YES(with dependencies)   NO(no dependencies)       │
    │                        │
    ↓                        ↓
┌──────────────────┐  ┌──────────────────┐
│ Manual Mode      │  │ Auto Mode        │
├──────────────────┤  ├──────────────────┤
│ isUsing = true   │  │ isUsing = false  │
│ Proxy disabled   │  │ Proxy enabled    │
│ Selector based   │  │ Path tracking    │
└──────────────────┘  └──────────────────┘
         │                    │
         ├────────┬───────────┤
         │        ↓           │
         │  ┌─────────────────┴───┐
         │  │  useSyncExternalStore │
         │  │  (React integration)  │
         │  └───────────────────────┘
         │        ↓
         │  ┌─────────────────────────┐
         │  │  resetTracking()        │
         │  │  (prepare for render)   │
         │  └─────────────────────────┘
         │        ↓
         │  ┌─────────────────────────┐
         │  │  notifyRender()         │
         │  │  (call deps function)   │
         │  └─────────────────────────┘
         │        ↓
         │  ┌──────────────────────────────┐
         │  │ commitTracking()  [useEffect]│
         │  │ (atomically update deps)     │
         │  └──────────────────────────────┘
         │        ↓
         └───────→ Render complete
```

## 2. Dependency Comparison Flowchart

```
                  State Change Emitted
                         ↓
                 notify(newState, oldState)
                         ↓
                For each subscription:
                         ↓
              Has selector? (dependencies)
                    ↙    ↘
                 YES      NO
                  ↓       ↓
        ┌──────────────┐  └────→ Path-based check
        │ Selector runs │
        └──────────────┘
             ↓
    newDeps = dependencies(bloc)
             ↓
    compareDependencies(oldValues, newDeps)
             ↓
     ┌───────┴───────┐
     ↓               ↓
  CHANGED         UNCHANGED
     │               │
     ├─ Update       ├─ Return cached
     │   deps        │   values (same
     │   values      │   object ref)
     │               │
     ├─ Update       │
     │   snapshot    │
     │               │
     └─→ Return new  │
        array        │
             ↓       ↓
    ┌─────────────────────────────┐
    │ Equality Check              │
    │ oldArray === newArray       │
    ├─────────────────────────────┤
    │ Unchanged: true (cached)    │
    │ Changed: false (new array)  │
    └─────────────────────────────┘
             ↓
    ┌────────┴────────┐
    ↓                 ↓
  false             true
    │                 │
    ├─ notify()      └─ NO CHANGE
    │   callback        no re-render
    │                   return old
    ├─ onChange()       snapshot
    │   triggered       return
    │                   snapshot
    ├─ React
    │   re-renders
    │
    └─ getSnapshot()
       returns new
       stateSnapshot
```

## 3. Dependency Storage Structure

```
BlacAdapter Instance
│
├─ dependencyValues: unknown[]
│  ├─ [0]: 'Alice'        ← user name
│  ├─ [1]: 25             ← user age
│  └─ [2]: 'admin'        ← user role
│
├─ stateSnapshot: BlocState
│  ├─ users: [...]        ← frozen state
│  ├─ selectedId: 1       ← at time of
│  └─ count: 0            ← last dependency match
│
├─ trackedPaths: Set<string>  (proxy mode)
│  ├─ 'users'
│  ├─ 'selectedId'
│  └─ 'count'
│
├─ pendingDependencies: Set<string>  (collected this render)
│  ├─ 'count'
│  └─ 'users'
│
└─ subscriptions
   └─ [subscription-id]
      ├─ type: 'consumer'
      ├─ selector: function
      ├─ lastValue: ['Alice', 25, 'admin']
      └─ equalityFn: Object.is
```

## 4. Comparison Deep Dive

```
compareDependencies(oldValues, newResult)

oldValues = ['Alice', 25]
newResult = ['Alice', 25]  ← What dependencies() returned

Is it a Generator?
         │
         NO (it's an array)
         │
    Compare lengths:
    oldValues.length === newResult.length?
         │
        YES (both 2)
         │
    Loop through indices:
    
    i = 0: Object.is('Alice', 'Alice') ?
           YES, continue
    
    i = 1: Object.is(25, 25) ?
           YES, continue
    
    Loop complete, all matched
    
    RETURN: false (no change detected)
    
═══════════════════════════════════════
    
oldValues = ['Alice', 25]
newResult = ['Alicia', 25]  ← Updated name
    
    i = 0: Object.is('Alice', 'Alicia') ?
           NO - CHANGE DETECTED!
    
    RETURN: true (changed)
    
═══════════════════════════════════════

Generator Version:
oldValues = ['Alice', 25]
newResult = generator(yield 'Alice'; yield 25;)

for (const newValue of newResult) {
  Check if index < oldValues.length:
    YES, compare values...
    
    i=0: Object.is('Alice', 'Alice')? YES
    i=1: Object.is(25, 25)? YES
    
    Loop ends
}

Compare: index (2) < oldValues.length (2)?
NO, lengths match

RETURN: false (no change)
```

## 5. State Snapshot Mechanism

```
User 1 Component               User 2 Component
(watching userId=1)            (watching userId=2)

Each has separate:
- dependencyValues              - dependencyValues
- stateSnapshot                 - stateSnapshot
- subscription                  - subscription

Global BlocInstance State: 
{
  users: [
    {id: 1, name: 'Alice', age: 25},
    {id: 2, name: 'Bob', age: 30}
  ],
  count: 0
}

User 1 Component snapshot:
{
  users: [
    {id: 1, name: 'Alice', age: 25},    ← watching this
    {id: 2, name: 'Bob', age: 30}
  ],
  count: 0
}

User 2 Component snapshot:
{
  users: [
    {id: 1, name: 'Alice', age: 25},
    {id: 2, name: 'Bob', age: 30}       ← watching this
  ],
  count: 0
}

═════════════════════════════════════════

Update User 2's name to 'Charlie':
Global State becomes:
{
  users: [
    {id: 1, name: 'Alice', age: 25},    ← NO CHANGE
    {id: 2, name: 'Charlie', age: 30}   ← CHANGED
  ],
  count: 0
}

User 1's subscription fires:
├─ dependencies(bloc) → ['Alice', 25]
├─ Compare vs ['Alice', 25] → NO CHANGE
├─ Return cached values
├─ getSnapshot() → User 1's snapshot
├─ React sees: NO CHANGE
└─ User 1: NO RE-RENDER ✓

User 2's subscription fires:
├─ dependencies(bloc) → ['Charlie', 30]
├─ Compare vs ['Bob', 30] → CHANGED
├─ Update dependencyValues = ['Charlie', 30]
├─ Update snapshot (new state reference)
├─ Return NEW array
├─ getSnapshot() → User 2's new snapshot
├─ React sees: CHANGE
└─ User 2: RE-RENDERS ✓
```

## 6. Proxy Mode (Without Dependencies)

```
Component Render
     ↓
┌─────────────────────┐
│ Access state.count  │
├─────────────────────┤
│ Proxy intercepts:   │
│ get trap fires      │
└─────────────────────┘
     ↓
┌────────────────────────────┐
│ trackAccess(               │
│   consumerRef,             │
│   'state',                 │
│   'count',  ← path tracked │
│   value                    │
│ )                          │
└────────────────────────────┘
     ↓
┌────────────────────────────┐
│ SubscriptionManager:       │
│ trackedPaths.add('count')  │
│ dependencies.add('count')  │
└────────────────────────────┘
     ↓
Component Render Complete
     ↓
State Changes: count from 0 to 1
     ↓
notify(newState, oldState)
     ↓
Check subscription's tracked paths:
├─ Tracked paths: {'count'}
├─ Changed paths: {'count'} (count reference changed)
├─ Match found! 'count' in both sets
└─ notify() callback → re-render ✓

═══════════════════════════════

If only other properties change:
State Changes: selectedId changes
     ↓
notify(newState, oldState)
     ↓
Check subscription:
├─ Tracked paths: {'count'}
├─ Changed paths: {'selectedId'}
├─ No match found
└─ notify() NOT called → NO re-render ✓
```

## 7. Two-Phase Tracking (Proxy Mode)

```
PHASE 1: RENDER
───────────────

Component render starts
     ↓
resetTracking()
├─ isTrackingActive = true
└─ pendingDependencies.clear()
     ↓
Component accesses:
├─ state.count → trackAccess('count')
│  └─ pendingDependencies.add('count')
├─ state.users → trackAccess('users')
│  └─ pendingDependencies.add('users')
└─ bloc.isLoading → trackAccess('isLoading')
   └─ pendingDependencies.add('_class.isLoading')

pendingDependencies = {'count', 'users', '_class.isLoading'}

Component render ends
     ↓

PHASE 2: COMMIT (useEffect)
────────────────────────────

commitTracking()
     ↓
isTrackingActive = false (stop collecting)
     ↓
Get current subscription:
├─ subscription.dependencies = 
│  {'count', 'selectedId'}  ← OLD
     ↓
Remove OLD paths from pathToSubscriptions:
├─ pathToSubscriptions.get('count').delete(subscriptionId)
├─ pathToSubscriptions.get('selectedId').delete(subscriptionId)
     ↓
ATOMIC SWAP:
subscription.dependencies = new Set(pendingDependencies)
    ↓
   {'count', 'users', '_class.isLoading'} ← NEW
     ↓
Add NEW paths to pathToSubscriptions:
├─ pathToSubscriptions.get('count').add(subscriptionId)
├─ pathToSubscriptions.get('users').add(subscriptionId)
└─ pathToSubscriptions.get('_class.isLoading').add(subscriptionId)

═════════════════════════════════════════════

Next render will track different properties:
│
└─ New pendingDependencies collected
   └─ Atomic swap with new values
```

## 8. Complete Re-render Decision Tree

```
                      State Emitted
                           ↓
                    _pushState(new, old)
                           ↓
              _subscriptionManager.notify()
                           ↓
                    For each subscription:
                           ↓
            Does subscription have selector?
               ↙             ↘
             YES             NO
              │               │
              ↓               ↓
    ┌──────────────────┐  ┌──────────────┐
    │ DEPENDENCIES MODE│  │ PROXY MODE   │
    └──────────────────┘  └──────────────┘
             │               │
             ├─ Call         ├─ Check if
             │ dependencies  │ tracked paths
             │ function      │ changed
             │               │
             ├─ Compare      ├─ If match:
             │ with          │ call notify
             │ compareDeps   │
             │               │
             ├─ Update deps  ├─ If no match:
             │ values        │ skip notify
             │               │
             ├─ Return       │
             │ cached or new │
             │ array         │
             │               │
             ├─ Equality     │
             │ check:        │
             │ oldArray===   │
             │ newArray      │
             │               │
             ├─ If false:    │
             │ call notify   │
             │               │
             └─ onStateChange
                     ↓
              React calls getSnapshot()
                     ↓
            return stateSnapshot (frozen)
            or current state
                     ↓
        Did snapshot change?
            ↙        ↘
          YES        NO
           │          │
           ├─ Re-render   └─ No re-render
           │    ✓
           └─ Return new state
              to component
```

## 9. Object Identity and Caching

```
Dependency values cached by OBJECT REFERENCE:

First call:
dependencies(bloc)
   ↓
returns: new Array ['Alice', 25]
   ↓
stored in: dependencyValues (reference)
   ↓
[0xABC123] = ['Alice', 25]

Next render, values unchanged:
dependencies(bloc)
   ↓
returns: new Array ['Alice', 25]  ← NEW OBJECT!
   ↓
compareDependencies() compares VALUES:
├─ 'Alice' === 'Alice' ? YES
├─ 25 === 25 ? YES
└─ Result: NO CHANGE DETECTED
   ↓
Return cached: [0xABC123] = ['Alice', 25]
   ↓
Equality: [0xABC123] === [0xDEF456] ?
          (cached)        (new)
          
          NO! Different objects

BUT WAIT: selector returns the CACHED array
   ↓
Equality becomes: [0xABC123] === [0xABC123] ?
                  (cached)        (same cached)
                  YES! Same object
   ↓
NO re-render (values returned from dependency function
remained the same object reference through selector)
```

## 10. Performance Characteristics

```
Comparison Complexity:
────────────────────

Array [n dependencies]:
- Best case: O(1)  - first element differs
- Worst case: O(n) - all match
- Average: O(n/2)

Generator [n dependencies]:
- Best case: O(1)  - early exit on first
- Worst case: O(n) - all match
- Advantage: stops iteration early if change found

SubscriptionManager.notify():
────────────────────────────

With proxy tracking:
- Check: pathToSubscriptions.get(changedPath)
- Time: O(m) where m = subscriptions for that path
- Called for each changed path

Without proxy tracking (dependencies):
- Check: selector equality
- Time: O(n) where n = dependency values
- Called once per state change

Memory Usage:
─────────────

Dependencies mode:
- Per subscription: O(n) = dependency count
- State snapshot: O(1) = reference only

Proxy mode:
- Per subscription: O(m) = tracked paths count
- Path mapping: O(p) = total unique paths
- Getter cache: O(g) = getter count × cached values
```

