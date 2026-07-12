---
"@blac/core": patch
---

Fix `PluginManager.install()` to backfill existing instances. Installing a
plugin after instances of a registered type already exist now attaches the
state-change bridge to those instances and fires the plugin's `onCreated`
hook for each of them, instead of silently missing everything created before
install. Also removes the unused, unexported `generateId`/`globalCounters`/
`createIdGenerator`/`__resetIdCounters` dead code from `utils/idGenerator.ts`
(internal only, no public API change).
