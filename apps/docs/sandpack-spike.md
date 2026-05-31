---
# Not linked in nav/sidebar — reachable only by direct URL.
title: Sandpack Interactivity Spike
---

<script setup>
import { perConsumerTrackingFiles } from './demos/per-consumer-tracking';
</script>

# Sandpack Interactivity Spike

::: warning TEMPORARY VERIFICATION ARTIFACT
This page is a throwaway spike (Phase 0.5 / item 2.0). It is **not** linked in
the nav or sidebar and exists only to prove that an editable, in-browser BlaC
playground can run inside VitePress via `sandpack-vue3`, resolving the published
`@blac/core@2.0.15` and `@blac/react@2.0.15` from Sandpack's CDN.

Once confirmed in a browser, the demo should be **promoted** into a real page
(e.g. `index.md` or `react/use-bloc.md`) or this page should be **removed**.
:::

The embed below runs entirely in your browser. Sandpack installs the published
`@blac/*` packages from its CDN and bundles the example live. Editing any file
hot-reloads the preview.

<BlacSandpack
  :files="perConsumerTrackingFiles"
  active-file="/App.tsx"
  :editor-height="500"
/>

## What to verify (browser)

Run the dev server and open this page, then check:

- [ ] **It renders.** The Sandpack editor (left) and live preview (right) both
      appear — no SSR crash, no blank box.
- [ ] **CDN install succeeds.** The preview boots without "module not found"
      errors. It is pulling `@blac/core@2.0.15` and `@blac/react@2.0.15` from
      Sandpack's CDN (open the Sandpack console if unsure). First load may take
      a few seconds while the bundler resolves the dependency tree.
- [ ] **It is editable.** Change something (e.g. the heading text in
      `App.tsx`, or the increment amount in `counters.ts`) and the preview
      hot-reloads with your change.
- [ ] **Per-consumer auto-tracking works (the payoff).** Click **Bump left**
      repeatedly: the **Left** "renders" counter ticks up, but the **Right**
      "renders" counter stays put. Then click **Bump right**: now only the
      **Right** counter ticks. Each consumer re-renders only when the slice it
      actually read changed.

If all four pass, the spike is confirmed and the demo is ready to promote.
