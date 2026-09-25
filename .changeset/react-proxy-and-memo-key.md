---
'@blac/react': patch
---

- The bloc proxy re-binds a method that was reassigned on the instance
  (e.g. by `withBlocMethod`) instead of returning the stale bound copy, and
  setters run against the real instance.
- `useBloc` keys its instance memo on the resolved instance key, so args
  that map to the same instance no longer rebuild the proxy.
- The first commit that sees a tracked dep re-renders if the dep's key now
  maps to a different instance.
