// Fixed HUD: shows body-execs vs DOM-patches (proves render-once + fine-grained
// patching) plus an FPS meter. Numbers are written directly via `ref` (not
// reactive holes) so the HUD itself never re-executes its own body.
import { html } from "@blac/lit";
import { createRef, ref } from "lit-html/directives/ref.js";
import { component } from "./component";
import { devStats } from "./devStats";

export const Hud = component((ctx) => {
  const bodyExecsRef = createRef<HTMLSpanElement>();
  const patchesRef = createRef<HTMLSpanElement>();
  const fpsRef = createRef<HTMLSpanElement>();
  const pulsesRef = createRef<HTMLButtonElement>();

  ctx.onMount(() => {
    const writeCounts = () => {
      const { bodyExecs, patches } = devStats.snapshot();
      if (bodyExecsRef.value)
        bodyExecsRef.value.textContent = String(bodyExecs);
      if (patchesRef.value) patchesRef.value.textContent = String(patches);
      if (pulsesRef.value)
        pulsesRef.value.textContent = devStats.arePulsesOn()
          ? "pulses: on"
          : "pulses: off";
    };
    writeCounts();
    const unsubscribe = devStats.subscribe(writeCounts);

    let last = performance.now();
    let rafId: number;
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const fps = delta > 0 ? 1000 / delta : 0;
      if (fpsRef.value) {
        fpsRef.value.textContent = String(Math.round(fps));
        fpsRef.value.style.color =
          fps >= 55 ? "#5ad07a" : fps >= 30 ? "#f5c451" : "#ff6b7a";
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    ctx.onUnmount(() => {
      unsubscribe();
      cancelAnimationFrame(rafId);
    });
  });

  return html`
    <aside class="hud">
      <div class="hud__row">
        <span class="hud__k">body execs</span>
        <span class="hud__v" ${ref(bodyExecsRef)}>0</span>
      </div>
      <div class="hud__row">
        <span class="hud__k">DOM patches</span>
        <span class="hud__v" ${ref(patchesRef)}>0</span>
      </div>
      <div class="hud__row">
        <span class="hud__k">fps</span>
        <span class="hud__v" ${ref(fpsRef)}>0</span>
      </div>
      <div class="hud__row">
        <button class="ghost" ${ref(pulsesRef)} @click=${() => devStats.togglePulses()}>
          pulses: on
        </button>
        <button class="ghost" @click=${() => devStats.reset()}>reset</button>
      </div>
      <p class="hint">
        green pulse = DOM hole patched · body execs stay flat = render-once
      </p>
    </aside>
  `;
});
