# G2 — Update `apps/devtools-extension` and verify end-to-end

**Phase:** G (sequential after F2 + F3; parallel-safe with G0/G1/G4 once F's are in)
**Model:** Sonnet 4.6
**Effort:** medium (browser extension shell; manual smoke test)
**Estimated touch:** ~5-10 files

---

## Goal

`apps/devtools-extension` is the actual browser extension shell that loads `@blac/devtools-ui`. After F2 (devtools-connect) and F3 (devtools-ui), update the extension to:

1. Use the new wire format.
2. Migrate any internal `useBloc` calls.
3. **End-to-end verify**: load the extension in a real browser against a real demo app (`apps/examples`), open devtools, confirm path-level highlighting works.

---

## Inputs — read these first

1. `apps/devtools-extension/src/**` and `manifest.json` (or equivalent).
2. `apps/devtools-extension/package.json`.
3. `packages/devtools-connect/src/**` (after F2).
4. `packages/devtools-ui/src/**` (after F3).
5. `~/.claude/CLAUDE.md` — commit format.

---

## What to change

1. **Wire format** — extension's message handlers consume the new shape (`paths` field). Should be transparent if F2 ships the protocol correctly.
2. **`useBloc` migrations** — `dependencies` → `select` if any.
3. **Asset/build pipeline** — usually unchanged; verify build still produces a loadable extension bundle.

## End-to-end verification

1. Build the extension: `vp run build` from `apps/devtools-extension/`.
2. Load it in Chrome via "Load unpacked" (or whatever the dev flow is).
3. Run `vp run dev` from `apps/examples/`.
4. Open the example app in Chrome.
5. Open devtools → blac panel.
6. Click a button in the example app that emits state.
7. Confirm the blac panel:
   - Lists the bloc instance.
   - Shows the new state.
   - Highlights the changed paths (or shows them in a side panel — whatever F3 implemented).

Capture a screenshot if possible; attach to the commit body via path reference.

---

## Owned files (write set)

```
apps/devtools-extension/**
```

**Do not touch:** any package; any other app.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - F2 and F3 have committed.

2. **Implement.**
   - Migrate `useBloc` callsites.
   - Update any wire-format-handling code if not transparent.

3. **Verify.**
   - `vp run typecheck` from `apps/devtools-extension/`.
   - `vp run lint`.
   - `vp run build` — produces an unpacked extension.

4. **Test.**
   - End-to-end smoke as above. **Required.** Without it, F2/F3 are unverified.

5. **Commit.**

   ```
   feat(devtools-extension): consume new wire format; verify end-to-end
   ```

   Body:

   ```
   - Migrated useBloc usages to `select`.
   - Smoke-tested against apps/examples: panel lists blocs, highlights
     changed paths, state values update on emit.
   ```

---

## Acceptance criteria

- [ ] Extension builds.
- [ ] Loads in Chrome as an unpacked extension.
- [ ] Panel opens on `apps/examples` demo.
- [ ] Click → emit → panel shows new state + changed paths.

---

## Pitfalls

- **Browser permissions** in `manifest.json` shouldn't change. If they do, you've gone too deep — back out.
- **CSP issues** — extensions enforce Content Security Policy. If F3's UI introduced inline styles or eval, this is where it breaks. Workaround usually lives in extension build config.
- **Hot reload of extension** — Chrome doesn't auto-reload unpacked extensions. Re-load manually each time you rebuild.
- **Don't rewrite the extension shell.** Match changes; don't redesign.
