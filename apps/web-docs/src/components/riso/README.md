# Riso components

Astro components that compose the T2.1 CSS primitives (`riso.css`) into
reusable, accessible page elements. **These are the ONLY sanctioned way to
introduce risograph "loudness" into a page.** Do not add `.riso-*` classes
directly to prose content or Starlight-managed layout — use these components
instead, or request a new one.

## The shared contract

| File                 | Role                                                                      |
| -------------------- | ------------------------------------------------------------------------- |
| `Grain.astro`        | Single site-wide grain overlay. Mount ONCE in the layout root. Singleton. |
| `RisoHeading.astro`  | Display heading with overprint colour + optional misregistration effect.  |
| `SectionBreak.astro` | Full-bleed halftone divider for between major sections.                   |

---

## Grain.astro

Mounts the single `.riso-grain` noise overlay that covers the entire viewport.

### Mount rule — read this

There must be **exactly one** `<Grain />` in the DOM per page. Render it as
the **first child of the layout root** (body or outermost wrapper), before any
page content. Later phases (Hero, layout overrides) import `Grain` rather than
adding a second `.riso-grain` element — a duplicate mount doubles the grain
opacity and breaks the single-GPU-layer design.

```astro
---
import Grain from '../components/riso/Grain.astro';
---

<body>
  <Grain />   <!-- must be first; never more than once -->
  <!-- rest of page -->
</body>
```

### Props

None. Opacity and blend mode are controlled globally via CSS custom properties
in `riso.css`:

| Property              | Default | Effect                       |
| --------------------- | ------- | ---------------------------- |
| `--blac-grain-opacity`| `0.035` | Paper-grain strength (0 – 1) |

To adjust opacity for a set-piece section, scope the override to the section's
ancestor, not the `<Grain />` element itself — the grain is fixed-position and
inherits from `:root`.

---

## RisoHeading.astro

A display heading rendered in `Fraunces` (`--blac-font-display`) with the
risograph overprint colour blend. Optionally adds a channel-split
misregistration offset for added "off-press" character.

### Usage

```astro
---
import RisoHeading from '../components/riso/RisoHeading.astro';
---

<!-- Default: h2, normal intensity -->
<RisoHeading>State management for React</RisoHeading>

<!-- h1 hero title, loud intensity -->
<RisoHeading as="h1" intensity="loud">BlaC</RisoHeading>

<!-- Subtle: overprint colour blend only, no channel-split offset -->
<RisoHeading as="h3" intensity="subtle">Getting started</RisoHeading>
```

### Props

| Prop        | Type                                           | Default    | Effect                                                        |
| ----------- | ---------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `as`        | `'h1'` – `'h6'`                               | `'h2'`     | Heading level rendered to the DOM.                            |
| `intensity` | `'subtle'` \| `'normal'` \| `'loud'`           | `'normal'` | Scales `--blac-misregister`; see table below.                 |
| `class`     | `string`                                       | —          | Forwarded to the heading element for caller-side overrides.   |

**Intensity → misregister mapping:**

| Value     | `--blac-misregister` | Classes applied                          |
| --------- | -------------------- | ---------------------------------------- |
| `subtle`  | `0.75px`             | `.riso-overprint` only                   |
| `normal`  | `1.5px`              | `.riso-overprint` + `.riso-misregister`  |
| `loud`    | `3px`                | `.riso-overprint` + `.riso-misregister`, plus `font-variation-settings: 'SOFT' 100, 'WONK' 1` |

### Slot

Default slot — the heading text. Keep it to a short phrase (1 – 6 words) for
the best visual result; the overprint effect reads best on display-size type.

### Animation hook (Phase 5)

The heading element carries two stable data attributes for Phase 5 animations
to target without modifying this component:

- `data-riso-heading="true"` — selects all riso headings
- `data-riso-intensity="subtle|normal|loud"` — selects by intensity tier

Phase 5 animates `--blac-misregister` on the element to produce the
registration-snap effect:

```css
/* Phase 5 example — do not add here */
[data-riso-heading] {
  transition: --blac-misregister 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
[data-riso-heading]:hover {
  --blac-misregister: 0px;
}
```

### Accessibility

The slot text is in the real heading element — announced once by screen
readers, selectable, keyboard-navigable. The overprint plates are CSS
`::before` / `::after` pseudo-elements with `content: ''`; they carry no
accessible text and are not in the a11y tree.

---

## SectionBreak.astro

A full-bleed halftone dot-field divider for visually separating major page
sections. The dots scale larger than the body default to create a visible
set-piece moment.

### Usage

```astro
---
import SectionBreak from '../components/riso/SectionBreak.astro';
---

<!-- Purely decorative divider -->
<SectionBreak />

<!-- With a centred label -->
<SectionBreak label="§ 02" />

<!-- Slot alternative to prop -->
<SectionBreak>Part II</SectionBreak>

<!-- Custom dot size + opacity for a louder moment -->
<SectionBreak dotSize="10px" dotOpacity="0.35" label="—" />
```

### Props

| Prop         | Type     | Default  | Effect                                           |
| ------------ | -------- | -------- | ------------------------------------------------ |
| `label`      | `string` | —        | Short text centred over the halftone field.      |
| `dotSize`    | `string` | `'6px'`  | Sets `--blac-halftone-size` for this break only. |
| `dotOpacity` | `string` | `'0.22'` | Sets `--blac-halftone-opacity` for this break.   |
| `class`      | `string` | —        | Forwarded to the outer wrapper.                  |

### Slot

Default slot — alternative to the `label` prop. If the slot has content it
renders instead of the prop value.

### Accessibility

A hidden `<hr>` provides the `separator` role for assistive technology. When a
label is present the outer `div` does not carry `aria-hidden`; when no label
is present it is marked `aria-hidden="true"` since the visual dot field is
purely decorative.

---

## Why these components are the only sanctioned entry point

Applying `.riso-*` classes outside these components bypasses the conventions
that keep the effect consistent and accessible:

- **Single grain mount** — a second `.riso-grain` element doubles noise and
  breaks GPU layering.
- **Accessible text** — `RisoHeading` guarantees text is announced once; raw
  class usage risks double-announcing if a caller accidentally adds `aria-label`
  or duplicates text in pseudo-element `content`.
- **Token hygiene** — the components reference only `--blac-*` vars; no raw
  hex or font strings leak into page markup.

If you need an effect not covered here, request a new component rather than
reaching for the raw class.
