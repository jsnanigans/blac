// Element-part directive: flashes its host element whenever the DOM inside it
// actually gets patched, and bumps devStats.bumpPatch() for the HUD. Put this on
// leaf holes (the specific span/cell showing a reactive value), not big wrappers.
//
// Honesty notes:
// - Observes childList + characterData + attributes (+ subtree), so text AND
//   attribute/class/style patches both register. Every MutationRecord is counted,
//   so a batch with N DOM ops bumps the patch count by N (not by 1).
// - The flash uses the Web Animations API (el.animate), NOT a CSS class toggle.
//   That is deliberate: toggling a class would itself be an attribute mutation and,
//   now that we observe attributes, would make the observer trigger on its own
//   animation. WAAPI animates presentation without mutating any attribute, so the
//   observer stays honest.
// - Blind spot: property bindings (`.value=`, `.checked=`, other JS-property holes)
//   set properties, not DOM/attributes, so NO MutationObserver can see them. Those
//   patches will not flash or count. This is a hard limitation, not a bug here.
import { nothing } from "lit-html";
import { directive, type ElementPart } from "lit-html/directive.js";
import { AsyncDirective } from "lit-html/async-directive.js";
import { devStats } from "./devStats";

class PulseDirective extends AsyncDirective {
  private el?: Element;
  private observer?: MutationObserver;
  private anim?: Animation;

  render(): unknown {
    return nothing;
  }

  update(part: ElementPart): unknown {
    if (!this.el) {
      this.el = part.element;
      this.observe();
    }
    return nothing;
  }

  private observe(): void {
    if (!this.el || this.observer) return;
    this.observer = new MutationObserver((mutations) =>
      this.onMutations(mutations),
    );
    this.observer.observe(this.el, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
    });
  }

  private onMutations(mutations: MutationRecord[]): void {
    // Count every real DOM op, always — the counter is the honest metric and must
    // not depend on whether the visual flash is enabled.
    devStats.bumpPatch(mutations.length);
    if (devStats.arePulsesOn()) this.flash();
  }

  private flash(): void {
    const el = this.el as HTMLElement | undefined;
    if (!el) return;
    this.anim?.cancel();
    this.anim = el.animate(
      [
        {
          backgroundColor: "rgba(124, 157, 255, 0.45)",
          boxShadow: "0 0 0 3px rgba(124, 157, 255, 0.35)",
          borderRadius: "6px",
        },
        {
          backgroundColor: "transparent",
          boxShadow: "0 0 0 3px transparent",
          borderRadius: "6px",
        },
      ],
      { duration: 450, easing: "ease" },
    );
  }

  protected disconnected(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.anim?.cancel();
    this.anim = undefined;
  }

  protected reconnected(): void {
    this.observe();
  }
}

const pulseDirective = directive(PulseDirective);

export function pulse(): unknown {
  return pulseDirective();
}
