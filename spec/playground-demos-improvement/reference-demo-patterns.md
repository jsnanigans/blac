# Reference Demo Patterns - Simple Counter

This document captures the patterns and conventions established in the reference demo (`simple-counter`) that should be replicated across all other demos.

## Document Status
- **Created**: 2025-10-13
- **Reference Demo**: `simple-counter` (apps/playground/src/demos/01-basics/counter/CounterDemo.tsx)
- **Completion Status**: Phase 3 Complete ✅

---

## 1. File Structure Pattern

```
demos/
├── 01-basics/
│   ├── counter/
│   │   ├── CounterDemo.tsx    # Main demo component
│   │   └── index.ts           # Registry registration
```

**Pattern:**
- One folder per demo
- Main component named `{Name}Demo.tsx`
- `index.ts` for demo registry (legacy, will be replaced by metadata export)

---

## 2. Component Structure Pattern

### Template Structure

```typescript
// 1. Imports
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

// 2. State Interface & Bloc/Cubit Class
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  // ... implementation
}

// 3. Helper Functions (celebrations, utilities)
const celebrate = () => {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
};

// 4. Interactive Sub-Components
function InteractiveCounter() {
  const [state, cubit] = useBloc(CounterCubit);
  // ... interactive demo UI
}

// 5. Demo Metadata
const demoMetadata = {
  id: 'simple-counter',
  title: 'Simple Counter',
  description: '...',
  category: '01-fundamentals',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'state', 'basics'],
  estimatedTime: 5,
  learningPath: { next: 'reading-state', sequence: 1 },
  theme: { primaryColor: '#3b82f6', accentColor: '#60a5fa' },
};

// 6. Main Demo Component
export function CounterDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Sections... */}
    </DemoArticle>
  );
}
```

**Key Principles:**
- Separate concerns: state logic → interactive UI → demo layout
- Helper functions above components (celebrations, formatting)
- Metadata defined as constant before main component
- Main demo component is pure layout/composition

---

## 3. Demo Metadata Pattern

```typescript
const demoMetadata = {
  id: string,              // Unique ID (kebab-case)
  title: string,           // Display title
  description: string,     // 1-2 sentence description
  category: string,        // e.g., '01-fundamentals'
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  tags: string[],          // ['cubit', 'state', 'basics']
  estimatedTime: number,   // Minutes to complete
  learningPath: {
    previous?: string,     // Previous demo ID
    next?: string,         // Next demo ID
    sequence?: number,     // Position in category
  },
  theme?: {
    primaryColor?: string,   // Hex color
    accentColor?: string,    // Hex color
  },
};
```

**Best Practices:**
- Always include `id`, `title`, `description`, `category`, `difficulty`, `tags`
- Include `estimatedTime` for user planning
- Use `learningPath.next` to guide users to next logical demo
- Theme colors optional but recommended for visual consistency

---

## 4. Article Section Pattern

### Narrative Flow Structure

The reference demo uses this proven narrative structure:

```tsx
<DemoArticle metadata={metadata} showBlocGraph={true}>
  {/* 1. Introduction - Hook the reader */}
  <ArticleSection theme="cubit" id="introduction">
    <Prose>
      <h2>Welcome to BlaC!</h2>
      <p>Start with the why, then the what...</p>
    </Prose>
  </ArticleSection>

  {/* 2. Interactive Demo - Show, don't just tell */}
  <ArticleSection id="demo">
    <SectionHeader>Try It Yourself</SectionHeader>
    <Prose>
      <p>Instructions for interaction...</p>
    </Prose>
    <div className="my-8">
      <InteractiveComponent />
    </div>
    <div className="my-8">
      <StateViewer bloc={YourBloc} />
    </div>
  </ArticleSection>

  {/* 3. Implementation - Reveal the how */}
  <ArticleSection theme="neutral" id="implementation">
    <SectionHeader>How It Works</SectionHeader>
    <Prose>
      <p>Explanation of code...</p>
    </Prose>
    <CodePanel code={...} language="typescript" highlightLines={...} lineLabels={...} />
    <Prose>
      <h3>Key Concepts</h3>
      <ul><li>...</li></ul>
    </Prose>
  </ArticleSection>

  {/* 4. Integration - Show usage in context */}
  <ArticleSection theme="cubit" id="react-integration">
    <SectionHeader>Using in React</SectionHeader>
    <Prose><p>...</p></Prose>
    <CodePanel code={...} />
  </ArticleSection>

  {/* 5. Takeaways - Consolidate learning */}
  <ArticleSection theme="success" id="takeaways">
    <SectionHeader>Key Takeaways</SectionHeader>
    <Prose>
      <ul><li>...</li></ul>
    </Prose>
  </ArticleSection>

  {/* 6. Next Steps - Guide forward */}
  <ArticleSection theme="info" id="next-steps">
    <SectionHeader>Next Steps</SectionHeader>
    <Prose>
      <p>What comes next...</p>
    </Prose>
  </ArticleSection>
</DemoArticle>
```

### Section Themes

Use these theme colors consistently:

- **`theme="cubit"`** - Blue theme for Cubit-related content
- **`theme="bloc"`** - Purple theme for Bloc-related content
- **`theme="event"`** - Orange theme for event-related content
- **`theme="success"`** - Green theme for achievements, takeaways
- **`theme="warning"`** - Yellow theme for cautions, important notes
- **`theme="info"`** - Blue-gray theme for informational content
- **`theme="tip"`** - Light blue theme for tips and hints
- **`theme="danger"`** - Red theme for errors, anti-patterns
- **`theme="neutral"`** - No background, just content (default)

---

## 5. Interactive Component Pattern

### Visual Design

```tsx
<div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
  {/* Animated display */}
  <motion.div
    key={state.value}  // Key on state to re-trigger animation
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    className="text-8xl font-bold text-concept-cubit"
  >
    {state.value}
  </motion.div>

  {/* Control buttons */}
  <div className="flex gap-3">
    <Button onClick={handler} variant="outline" size="lg">Action</Button>
  </div>

  {/* Status/hints */}
  {condition && (
    <p className="text-sm text-muted-foreground">
      Hint or status message...
    </p>
  )}
</div>
```

**Best Practices:**
- Use concept colors (`concept-cubit`, `concept-bloc`, `concept-event`) for themed components
- Gradient backgrounds with opacity (`from-concept-cubit/10`)
- Border with concept color at medium opacity
- Animate key state values with Framer Motion (`key={state.value}`)
- Spring physics for natural motion (`type: 'spring'`)
- Center-aligned for focus
- Generous spacing (`gap-6`, `p-8`)

---

## 6. Celebration Pattern

### When to Celebrate

```typescript
const handleAction = () => {
  cubit.doSomething();

  // Celebrate on milestones
  if ((state.value + 1) % 10 === 0) {
    celebrate();
  }
};

const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};
```

**Best Practices:**
- Celebrate milestones (every 10, reaching goals, completing challenges)
- Use moderate particle count (50-100)
- Origin slightly below center (`y: 0.6`) looks best
- Don't overdo it - special moments only
- Consider different confetti styles for different achievements

---

## 7. Code Panel Pattern

### With Highlights and Labels

```tsx
<CodePanel
  code={sourceCode}
  language="typescript"  // or 'tsx', 'javascript', 'jsx', 'json'
  title="CounterCubit.ts"  // Optional filename
  showLineNumbers={true}
  highlightLines={[2, 6, 10, 14, 18]}  // Lines to highlight
  lineLabels={{
    2: 'Define your state shape',
    6: 'Initialize with default state',
    10: 'Update state with patch()',
  }}
  collapsible={false}  // Optional: allow collapsing
  maxHeight="500px"    // Optional: max height before scrolling
/>
```

**Best Practices:**
- Highlight key lines that demonstrate important concepts
- Add labels to explain **why** something matters, not just **what** it is
- Keep labels concise (one sentence max)
- Use appropriate language for syntax highlighting
- Include file name when showing complete file examples
- Line numbers on by default for reference

---

## 8. State Viewer Pattern

```tsx
<StateViewer
  bloc={CounterCubit}
  title="Live Counter State"
  maxDepth={3}           // For nested objects
  defaultCollapsed={false}
  showCopy={true}        // Allow copying state to clipboard
/>
```

**Best Practices:**
- Always include after interactive demos
- Use descriptive titles ("Live Counter State", "Form Values", "API Response")
- Place below interactive component for visual flow
- For complex state, set `maxDepth` appropriately
- Enable copy button for developers to inspect values

---

## 9. Prose Content Pattern

### Writing Style

```tsx
<Prose>
  <p>
    Short, conversational paragraphs. One idea per paragraph.
    Use <strong>bold</strong> for emphasis on key terms.
  </p>
  <p>
    Code references use <code>inline code</code> styling.
    Always explain what and why, not just how.
  </p>

  <h3>Subheadings Break Up Content</h3>
  <ul>
    <li><strong>Term</strong>: Explanation with context</li>
    <li>Use lists for multiple related points</li>
  </ul>

  <ol>
    <li>Use numbered lists for sequential steps</li>
    <li>Or for ordered concepts that build on each other</li>
  </ol>
</Prose>
```

**Writing Best Practices:**
- Conversational, friendly tone (like explaining to a colleague)
- Short paragraphs (2-4 sentences max)
- Active voice ("You create a Cubit" not "A Cubit is created")
- Explain **why** before **how**
- Use analogies when helpful
- Bold key terms on first use
- Inline `code` for method names, prop names, keywords
- Lists for scannable information
- Questions engage readers ("What happens when...?")

---

## 10. Animation Pattern

### State Change Animations

```tsx
<motion.div
  key={state.value}  // IMPORTANT: Key on state
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
>
  {state.value}
</motion.div>
```

### Entrance Animations (handled by ArticleSection)

ArticleSection components automatically fade in on scroll. No additional animation needed.

**Best Practices:**
- Key animations on state values to re-trigger on change
- Use spring physics for natural motion
- Higher stiffness (500) for snappy feel
- Lower damping (25) for slight bounce
- Scale + opacity combo feels polished
- Keep animations under 300ms for responsiveness

---

## 11. Color Usage Pattern

### Concept Colors

- **`concept-cubit`** (#3b82f6) - Blue for Cubit
- **`concept-bloc`** (#8b5cf6) - Purple for Bloc
- **`concept-event`** (#f97316) - Orange for Events

### Semantic Colors

- **`semantic-success`** - Green for success, achievements
- **`semantic-warning`** - Yellow/Orange for warnings
- **`semantic-danger`** - Red for errors, anti-patterns
- **`semantic-info`** - Blue for informational content
- **`semantic-tip`** - Light blue for tips

### Usage

```tsx
// Text colors
className="text-concept-cubit"

// Background colors
className="bg-concept-cubit/10"  // 10% opacity

// Borders
className="border-concept-cubit border-2"

// Gradients
className="bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5"
```

---

## 12. Accessibility Pattern

### Semantic HTML

```tsx
<article>  {/* DemoArticle renders as article */}
  <header>  {/* Demo header */}
    <h1>Title</h1>
  </header>

  <section>  {/* ArticleSection renders as section */}
    <h2>Section Title</h2>
  </section>

  <footer>  {/* Navigation footer */}
    <nav>
      <a href="...">Previous</a>
      <a href="...">Next</a>
    </nav>
  </footer>
</article>
```

### Best Practices

- Proper heading hierarchy (h1 → h2 → h3)
- Descriptive button labels
- ARIA labels on icon-only buttons
- Sufficient color contrast
- Focus indicators on interactive elements
- Keyboard navigation support (built into components)

---

## 13. Mobile Responsiveness Pattern

### Responsive Classes

```tsx
// Text sizes
className="text-4xl sm:text-5xl"  // Smaller on mobile

// Spacing
className="px-4 sm:px-6 lg:px-8"  // Progressive spacing

// Flex direction
className="flex flex-col md:flex-row"  // Stack on mobile

// Grid columns
className="grid grid-cols-1 md:grid-cols-2"
```

**Breakpoints:**
- `sm:` - 640px (large phones)
- `md:` - 768px (tablets)
- `lg:` - 1024px (desktops)
- `xl:` - 1280px (large desktops)

---

## 14. Checklist for New Demos

Use this checklist when creating or refactoring demos:

### Structure ✅
- [ ] Wrapped in `<DemoArticle>` with complete metadata
- [ ] Has clear learning objectives stated upfront
- [ ] Uses `ArticleSection` for logical grouping
- [ ] Includes prev/next navigation via `learningPath`

### Content ✅
- [ ] Narrative flows like an article (not just code dumps)
- [ ] Text is conversational and engaging
- [ ] Concepts build progressively (simple → complex)
- [ ] Includes 2-3 key insights or tips
- [ ] Code examples are syntax-highlighted and explained

### Interactivity ✅
- [ ] Has interactive elements users can manipulate
- [ ] Celebrates user actions on milestones
- [ ] Includes `StateViewer` showing live state
- [ ] Uses `BlocGraphVisualizer` if demonstrating instances/lifecycle
- [ ] All buttons and inputs have clear labels

### Visual Design ✅
- [ ] Uses color strategically (not randomly)
- [ ] Color-codes concepts consistently
- [ ] Proper spacing and visual hierarchy
- [ ] Responsive on mobile devices
- [ ] Animations are smooth (spring physics)

### Code Quality ✅
- [ ] TypeScript types are complete
- [ ] Arrow functions used for Bloc/Cubit methods
- [ ] No console errors or warnings
- [ ] Builds without errors (`pnpm typecheck`, `pnpm build`)

### Accessibility ✅
- [ ] Semantic HTML (headings, sections, landmarks)
- [ ] Color is not the only indicator (use text + icons)
- [ ] Keyboard navigation works
- [ ] Focus visible on interactive elements

---

## 15. Next Steps

### Immediate (Current Phase)
- ✅ Reference demo complete and tested
- ⏳ Build Phase 4 interactive components (ConceptCallout, ComparisonPanel, InteractionFeedback)
- ⏳ Update plan.md to reflect Phase 3 completion

### Phase 4 - Interactive Components
- Build `ConceptCallout` component (tips, warnings, info boxes)
- Build `ComparisonPanel` component (side-by-side comparisons)
- Build `InteractionFeedback` component (wraps confetti triggers)
- Document component APIs with Storybook (optional but recommended)

### Phase 5+ - Scale Demo Development
- Use reference demo as template for remaining 34-39 demos
- Replicate patterns consistently
- Regular sync meetings for consistency (if team > 1)
- PR review against this checklist

---

## Document Maintenance

This patterns document should be updated when:
- New patterns emerge during demo development
- Better approaches are discovered
- Components are enhanced with new features
- User feedback reveals improvements

**Last Updated**: 2025-10-13
**Next Review**: After Phase 4 completion
