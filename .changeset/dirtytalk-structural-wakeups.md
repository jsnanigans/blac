---
'@dirtytalk/structural': patch
'@blac/react': patch
---

Fix missed re-renders:

- The root tracking proxy is no longer reused across renders, so a
  `useMemo(..., [state])` that skips its reads still tracks.
- `Object.keys(state)`, `for..in` and `'k' in state` on the root now wake
  when a root key is added.
- `useStructural` and `useBloc` re-render when state changed between render
  and commit.
- `useBloc` stops dep tracking at commit, so reads in effects and handlers no
  longer add dep paths.
