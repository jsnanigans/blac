---
'@blac/react': patch
---

Re-subscribe `useBloc` when `RegistryProvider` swaps its registry. The
component previously stayed subscribed to the instance in the old registry
and ignored emits on the new one.
