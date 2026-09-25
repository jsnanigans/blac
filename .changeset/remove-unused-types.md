---
'@blac/core': patch
---

Remove the unused `ExtractConstructorArgs`, `BlocInstanceType` and
`BlocConstructor` type exports. Use TypeScript's `ConstructorParameters` /
`InstanceType` or `StateContainerConstructor` instead.
