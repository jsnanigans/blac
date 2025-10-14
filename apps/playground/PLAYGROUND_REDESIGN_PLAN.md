# Playground Redesign Plan

## 1. Current Experience Audit

- **Global shell**  
  - Sticky header duplicates navigation affordances on desktop and mobile without progressive disclosure; density is high for small viewports.  
  - Theme toggle and CTA cluster share the same hierarchy as secondary links (Docs, GitHub), making the primary navigation feel flat.  
  - Lacks persistent context for the currently active section once users dive into Guide or Playground routes.
- **Home**  
  - Hero block is vertically stacked with limited storytelling; secondary CTAs compete equally with the primary action.  
  - Feature grid repeats the same card styling without icon or copy hierarchy, producing visual monotony.  
  - Quick-start links are valuable but appear as generic cards without supporting context or preview imagery.
- **Guide (landing + detail)**  
  - Sidebar has inconsistent affordances between mobile/desktop, and content begins abruptly without framing or onboarding context.  
  - Breadcrumb layer consumes vertical space and reiterates section identifiers already visible in the sidebar.  
  - Detailed pages mix article-style content with demo chrome; transitions animate entire page, which can feel heavy.
- **Playground**  
  - Single-resize splitter favors desktop; vertical space is under-utilized for explaining output, project metadata, and controls.  
  - Toolbar actions lack grouping (run/reset/share/save all presented inline) and there is no indication of run states beyond button text.  
  - Output console and preview share space but feel visually detached; performance tab is hidden behind generic tabs.
- **Misc utility pages (prototype-test, graph-test)**  
  - Experiments load without context or scaffolding, creating a stark, tool-like appearance that diverges from the rest of the product.
- **Component & style system**  
  - Tailwind tokens follow shadcn defaults; brand-specific accent is absent.  
  - Motion is applied inconsistently (Guide landing sections animate individually; other surfaces are static).  
  - Custom components (e.g., Card, Button) wrap tailwind classes only; there is no dedicated layout primitive (Shell, SplitView, Toolbar) to encourage reuse.

## 2. Design Goals & Visual Language

- **Vision**: Position the Playground as a polished developer workbench that balances learning and experimentation.  
- **Tone**: Calm neutrals, confident accent color, sparse gradients applied sparingly for hero/celebration moments.  
- **Typography**: Adopt a clear hierarchy—Display (`text-5xl/medium`) for hero, `text-3xl` for section headings, `text-lg` body copy, and monospace callouts for code.  
- **Color strategy**:  
  - Introduce an `--brand` hue (e.g., 224 95% 60%) applied to CTAs, focus indicators, and hero gradients.  
  - Differentiate surfaces: `background` (base), `surface` (cards/panels), `surface-muted` (toolbars/secondary panels).  
  - Expand semantic tokens for success/warning/info aligned with Playground feedback states.
- **Components**: Define new primitives—`<AppShell>`, `<PageHeader>`, `<Toolbar>`, `<SplitPane>`, `<CommandBar>`, `<MetricPill>`, `<SurfaceCard>`.  
- **Spacing rhythm**: Base grid at 8px; vertical rhythm anchored to 16/24/32 increments.  
- **Interaction guidelines**: Buttons have two elevations (default, emphasized), toolbars use icon-only buttons with tooltips, transitions limited to 150–200ms ease-out for stateful changes.  
- **Accessibility**: Minimum 4.5:1 color contrast, focus outlines visible on all controls, keyboard access for splitters and command palette.

## 3. Global Layout Architecture

- **Shell**  
  - Convert current header into a two-tier shell: top strip (branding, theme toggle, GitHub link) and primary workspace bar (global nav, search, command palette trigger).  
  - Introduce a collapsible left rail housing navigation, guide sections, or project files depending on route.  
  - Persist a right rail slot for context panels (run history, learning tips, release notes).
- **Grid**  
  - Adopt a 12-column responsive grid with `max-width: 1280px` for content-heavy pages and `full-bleed` modes for the Playground or graph tools.  
  - Breakpoints: sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
- **Navigation**  
  - Primary nav: Home, Guide, Playground, Experiments (new).  
  - Secondary nav (top strip): Docs (external), GitHub, version badge.  
  - Command palette promoted as contextual search with ambient keyboard shortcut hint.
- **Theming**  
  - Update Tailwind config tokens to include `--surface`, `--surface-elevated`, `--border-strong`; add `brand` palette for accent states.  
  - Provide dark/light parity with distinct surface layering rather than inverted backgrounds.  
  - Prepare for future high-contrast theme by isolating tokens in CSS variables.

## 4. Page & Feature Redesign Concepts

- **Home**  
  - Hero: Split layout (copy left, interactive code snippet preview right) with gradient aura and subtle motion.  
  - Introduce “Why BlaC” section using three narrative tiles (Learn, Build, Optimize) with iconography and supporting copy.  
  - Replace uniform feature cards with mixed media (code previews, metrics, testimonial).  
  - Quick-start becomes “Choose your starting point” timeline with step numbers, preview screenshot, estimated time.  
  - Add community/update strip showcasing release notes or featured content.
- **Guide Landing**  
  - Add onboarding header describing structure, include filter pills (Beginner/Intermediate/Advanced).  
  - Convert stat cards into horizontal summary bar with icons and supportive copy.  
  - Learning path cards adopt progress indicators (chapter count, estimated duration).  
  - Featured demos displayed via carousel or horizontal scroller with visual thumbnail and difficulty pill.
- **Guide Detail**  
  - Left sidebar becomes persistent but collapsible; include search, progress tracker, and onboarding tooltip.  
  - Breadcrumb replaced with top `PageHeader` featuring section icon, title, short description, difficulty.  
  - Content area uses two-column layout: article on left (markdown), demo + controls pinned on right (sticky).  
  - Footer navigation replaced with `CommandBar` presenting Next/Previous, share, open in Playground actions.
- **Playground**  
  - Shell: Top command toolbar with grouped actions (Run, Stop, Format, Share) and status indicator.  
  - Left rail: File tree with pinned demos, ability to toggle between “Files” and “Snippets”.  
  - Main area: Resizable `SplitPane` supporting horizontal/vertical orientation toggle, with keyboard accessible drag handles.  
  - Preview panel gains tabs: `Preview`, `State`, `Performance`, `Console`. Each tab contains structured cards.  
  - Introduce run output timeline (timestamped logs) and environment info (TS version, compile status).  
  - Empty states for preview/console with iconography and helpful links.
- **Experiments (prototype-test, graph-test)**  
  - Wrap each in standard `AppShell` with descriptive page header, status badge (“Labs”).  
  - Provide short documentation drawer on the right to contextualize prototypes.
- **Global utilities**  
  - Command palette visually aligned with new theme, grouped results by type (Pages, Demos, Commands).  
  - Toasts/snackbars standardized using `SurfaceCard` tokens.

## 5. Component & Utility Overhaul

- Build shared layout primitives in `src/layouts` (`AppShell`, `ShellHeader`, `ShellSidebar`, `ShellMain`, `ShellAside`).  
- Introduce `WorkspaceToolbar` component with slot-based grouping for primary and secondary actions.  
- Create `SplitPane` abstraction around current drag logic with accessibility improvements and orientation support.  
- Add `PageHeader` component supporting breadcrumb, meta badges, actions.  
- Add playful-yet-simple article primitives (`ArticleSection`, `CodePanel`, `Prose`) with updated gradients and tokens.  
- Refine `Card`, `Badge`, `Button` to align with new brand tokens and include size/variant props.  
- Consolidate repeated stat/feature cards into reusable `FeatureTile`, `MetricPill`, `QuickStartStep`.  
- Provide `EmptyState` component for console/output panels.

## 6. Styling & Theming Refactor

- Extend `tailwind.config.ts` to include new color tokens (brand, surface, accent) and font stacks (display, mono).  
- Update `index.css` to define layered surfaces (`--surface`, `--surface-elevated`, `--surface-muted`), new shadows, and motion tokens.  
- Establish component-specific class compositions via Tailwind’s `@apply` in dedicated style modules when utility classes become verbose.  
- Configure `framer-motion` defaults (e.g., gentle spring profiles) through shared constants.  
- Ensure dark mode uses complementary but not inverted hues (e.g., brand accent shifts to 220 90% 70%).

## 7. Implementation Roadmap

1. **Foundation**  
   - ✅ Update design tokens, Tailwind configuration, typography, and global CSS.  
   - ✅ Create core layout primitives (`AppShell`, `ShellTopBar`, `ShellHeader`, `ShellBody`, etc.).  
   - ✅ Refactor Root layout to adopt new shell.  
   - ✅ Implement `PageHeader`, `SplitPane`, and workspace toolbar primitives.
2. **Page conversions**  
   - ✅ Home page redesign leveraging new components.  
   - ✅ Guide landing + detail pages, including sidebar refactor and article/demo split layout.  
   - ✅ Demo article shell + foundational demos (Hello World, counter, reading state, updating state) adopt new styling.  
   - ◻ Playground workspace overhaul with new toolbar, pane management, and tabbed preview (multi-file workspace complete; ancillary modes pending).  
   - Experiments and utility pages wrapped in standardized shell.
3. **Enhancements & polish**  
   - Command palette styling, toast notifications, empty states.  
   - Animations/micro-interactions (button feedback, panel transitions).  
   - Accessibility pass (focus order, aria labels, keyboard resizing).
4. **Validation & handoff**  
   - Cross-browser smoke tests, responsive QA across breakpoints.  
   - Update docs (`README`, `MONACO_INTEGRATION`, `PLAYGROUND_PLAN`) to reflect new UX.  
   - Capture before/after screenshots, finalize release notes.

## 8. Success Criteria

- Time-to-first-interaction in Playground under 2 seconds after load, with visible status feedback.  
- Users can access any guide demo within two clicks of landing on the Guide page.  
- Clear differentiation between learning surfaces and experimentation surfaces across desktop and mobile.  
- Consistent component styling verified via Chromatic/regression tests or Storybook parity (future enhancement).
