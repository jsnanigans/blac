---
'@dirtytalk/structural': patch
'@blac/react': patch
---

Reading a key the state doesn't have yet (`item.done` before it is set) now tracks that path, so the component re-renders when the key is added. Previously the read was ignored: a component that also read a sibling field never woke for the new key, and one that read nothing else woke on every change to the parent object.
