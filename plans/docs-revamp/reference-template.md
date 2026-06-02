# Reference page template (per-symbol)

The canonical skeleton for every API reference page in `apps/docs`. Lifted from
`apps/docs/dirtytalk/engine/api-reference.md` (the gold standard). Rollout agents
(3.R1/R2/R3) **copy this shape verbatim**; the exemplar is
`apps/docs/core/cubit.md`.

> "Predictability is the feature." Every reference page reads the same way, so a
> reader who learns one page can navigate all of them. Do not invent per-page
> structure.

---

## The build is the only oracle

`pnpm -F @blac/docs build` (from repo root) type-checks every ` ```ts twoslash `
block against the real `@blac/core` / `@blac/react` types. A block that "looks
right" or "passes in isolation" is not enough — the single authority is the
build exiting `0`. Run it before every commit.

---

## Page-level skeleton

```
# <Page title>                       (H1, sentence case after the first word)

<1–3 sentence orientation: what this symbol/module is, when you reach for it.>

<Optional: a "## Entry points" / import table if the page covers a module.>

## <Symbol or group>                 (H2 per top-level symbol)

### <Member or method>               (H3 per member: method, getter, ctor)
   → Signature fence (verbatim)
   → Parameter table        (omit if zero params)
   → **Returns:** …         (always, even for void)
   → Behavior               (prose: edge cases, short-circuits, ordering)
   → Example                (runnable; ts twoslash if no JSX, else tsx)

## See also                          (cross-links, last before Troubleshooting)

## Troubleshooting                   (OPTIONAL, co-located, page-specific)
```

---

## Per-symbol rules (the checklist)

Tick every box for each symbol you document.

### 1. Heading

- [ ] `## ` (H2) for each top-level symbol; `### ` (H3) for each member/method/
      getter/constructor under it.
- [ ] **Sentence case** headings (`## Mutation methods`, not `## Mutation
Methods`). The H1 page title and proper nouns/code keep their casing.
- [ ] When the heading names code, wrap it in backticks: `### \`emit(next)\``.

### 2. Signature fence comes FIRST

- [ ] Immediately under the heading, a fenced code block with the **verbatim**
      signature copied from source — **full generics and the return type**.
- [ ] Use a plain ` ```ts ` fence for the signature (no `twoslash`): it is a
      quoted declaration, not runnable code, and must show generics/`protected`/
      `override` exactly as written in source.
- [ ] One signature per fence. For a class, you may show the class header +
      member list in one fence, then expand each member under its own H3.
- [ ] Quote from source, not memory. If the source says
      `update(fn: (state: S) => S): void`, write exactly that — do not
      paraphrase param names or widen/narrow types.

### 3. Parameter table

- [ ] Present when the symbol takes ≥1 parameter. Omit entirely for zero-param
      members (a getter, `pump()`).
- [ ] Columns: `Parameter | Type | Required | Description`. Drop the `Required`
      column only if every param is required AND you note it in prose; prefer
      keeping it.
- [ ] Types in backticks, verbatim from the signature.

### 4. Explicit Returns

- [ ] An explicit **`Returns:`** line for every member — including `void`
      (`**Returns:** \`void\`.`). For a function-returning method, describe what
the returned function does (e.g. "a getter `() => InstanceType<T>` that
      resolves the dep lazily").

### 5. Behavior

- [ ] Prose covering the non-obvious: short-circuits, equality semantics,
      ordering, re-entrancy, dispose guards, dev-only warnings. This is where
      source-archaeology facts land. Use `::: tip/info/warning/danger`
      callouts for traps.

### 6. Example

- [ ] Every symbol gets at least one runnable example.
- [ ] **Self-contained imports.** Each example fence imports everything it uses
      (`import { Cubit } from '@blac/core';`). Twoslash compiles each block in
      isolation — no implicit carry-over from a previous block.
- [ ] **No JSX in `ts twoslash`.** The docs typecheck has **no `@types/react`**
      and no JSX config. A `<span>`/`<button>`/`<div>` inside a ` ```ts twoslash `
      fence **fails the build**. For type-checked, non-JSX code use
      ` ```ts twoslash `. For any JSX/React snippet use a plain ` ```tsx ` fence
      (unchecked) — never `tsx twoslash`.
- [ ] Prefer `ts twoslash` wherever the example has no JSX, so the build verifies
      it against real types. Reach for plain `tsx` only when you genuinely need a
      component.
- [ ] Keep examples minimal and real — show the symbol doing its actual job, with
      inline `// =>` result comments where a value is produced.

### 7. Co-located Troubleshooting (optional)

- [ ] If the page has page-specific failure modes, append a single
      `## Troubleshooting` section as the **last** section (after `## See also`).
- [ ] Structure each entry as `### <short symptom title>` →
      **Symptom:** / **Cause:** / **Fix:** (with a fix snippet) → a back-link to
      the relevant section above and/or the global `/guide/troubleshooting`.
- [ ] This slot is where a prior task's appended Troubleshooting content lives —
      **preserve existing entries**; do not delete facts when restructuring.

---

## Conventions recap (copy into every rollout brief)

1. Build is the only oracle: `pnpm -F @blac/docs build` exit `0`.
2. Signature fence first, verbatim from source, full generics + return type,
   in a plain ` ```ts ` fence.
3. Parameter table (`Parameter | Type | Required | Description`) when params
   exist; explicit **Returns:** always.
4. `ts twoslash` for type-checked NON-JSX examples; plain `tsx` (unchecked) for
   any JSX. JSX inside a twoslash fence fails the build.
5. Self-contained imports in every example fence.
6. Sentence-case headings; backtick code in headings.
7. Don't change facts — restructure and fill gaps. Preserve any existing
   `## Troubleshooting` content.
8. Verify before commit: `vp fmt <your files>` then `vp run format:check` (only
   your files; ignore pre-existing `apps/perf/src/migration-bench/*` failures).

---

## Reference exemplar

`apps/docs/core/cubit.md` is the worked example of this template — it covers
`emit` / `update` / `patch`, getters, the `init` / `onDepsChanged` lifecycle, the
`depend` protected API, public properties, and a co-located `## Troubleshooting`.
When in doubt, match its shape exactly.
