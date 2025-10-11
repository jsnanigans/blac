# Demo Article Components

Interactive article-style components for creating engaging, educational BlaC demos.

## Overview

These components provide a flexible, component-based system for building demos that read like interactive articles. They enforce consistency through required wrappers while allowing flexible content composition.

## Components

### DemoArticle (Required Wrapper)

The required wrapper component that enforces consistent structure across all demos.

**Features:**
- Renders header with title, difficulty badge, and tags
- Scroll progress indicator
- Prev/next navigation
- Provides context for child components
- Optional Bloc graph visualization

**Example:**

```tsx
import { DemoArticle } from './components/demo-article';

const metadata = {
  id: 'simple-counter',
  title: 'Simple Counter',
  description: 'Learn the basics of state management with Cubit',
  category: '01-fundamentals',
  difficulty: 'beginner',
  tags: ['cubit', 'state', 'basics'],
  estimatedTime: 5,
  learningPath: {
    previous: 'hello-world',
    next: 'reading-state',
    sequence: 2,
  },
};

function SimpleCounterDemo() {
  return (
    <DemoArticle
      metadata={metadata}
      showBlocGraph={true}
      graphLayout="grid"
    >
      {/* Your demo content here */}
    </DemoArticle>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `metadata` | `DemoMetadata` | **required** | Demo metadata (title, description, etc.) |
| `showBlocGraph` | `boolean` | `false` | Enable Bloc graph visualization |
| `graphLayout` | `'grid' \| 'force'` | `'grid'` | Graph layout algorithm |
| `highlightLifecycle` | `boolean` | `true` | Highlight lifecycle states in graph |
| `children` | `React.ReactNode` | **required** | Demo content |
| `className` | `string` | - | Additional CSS classes |

---

### ArticleSection

Content grouping component with theme colors for organizing demo content.

**Features:**
- Color-themed sections (cubit, bloc, event, tip, warning, etc.)
- Smooth scroll anchor support
- Entrance animations on scroll
- Responsive spacing

**Example:**

```tsx
import { ArticleSection, SectionHeader } from './components/demo-article';

<ArticleSection theme="cubit" id="basics">
  <SectionHeader>Understanding Cubits</SectionHeader>
  <Prose>
    <p>A Cubit is the simplest form of state management...</p>
  </Prose>
</ArticleSection>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `SectionTheme` | `'neutral'` | Theme color (cubit, bloc, event, tip, warning, success, info, danger, neutral) |
| `id` | `string` | - | HTML id for scroll anchoring |
| `children` | `React.ReactNode` | **required** | Section content |
| `showBorder` | `boolean` | `true` | Show left border |
| `noAnimation` | `boolean` | `false` | Disable entrance animation |
| `backgroundColor` | `string` | - | Custom background color (overrides theme) |
| `className` | `string` | - | Additional CSS classes |

---

### Prose

Typography component with optimal readability for article-style content.

**Features:**
- Line length constraints (60-80 characters)
- Proper heading hierarchy
- Styled lists, code, blockquotes
- Responsive typography

**Example:**

```tsx
import { Prose, InlineCode } from './components/demo-article';

<Prose size="base" maxWidth="md">
  <h2>What is a Cubit?</h2>
  <p>
    A <InlineCode>Cubit</InlineCode> is a class that extends <InlineCode>BlocBase</InlineCode>
    and manages state through direct emission.
  </p>
  <ul>
    <li>Simple state management</li>
    <li>Direct state emission</li>
    <li>No events required</li>
  </ul>
</Prose>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | **required** | Content |
| `size` | `'sm' \| 'base' \| 'lg'` | `'base'` | Typography size |
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Max width constraint |
| `className` | `string` | - | Additional CSS classes |

---

### CodePanel

Syntax-highlighted code display with interactive features.

**Features:**
- Syntax highlighting (Night Owl theme)
- Copy to clipboard button
- Line highlighting with labels
- Expandable/collapsible
- Language indicator

**Example:**

```tsx
import { CodePanel } from './components/demo-article';

const code = `
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}
`;

<CodePanel
  code={code}
  language="typescript"
  title="CounterCubit.ts"
  highlightLines={[3, 7]}
  lineLabels={{
    3: 'Initial state',
    7: 'Emit new state',
  }}
  showLineNumbers
  collapsible
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | **required** | Source code to display |
| `language` | `Language` | **required** | Programming language |
| `title` | `string` | - | Title/filename |
| `highlightLines` | `number[]` | `[]` | Lines to highlight |
| `lineLabels` | `Record<number, string>` | `{}` | Labels for specific lines |
| `showLineNumbers` | `boolean` | `true` | Show line numbers |
| `collapsible` | `boolean` | `false` | Allow collapsing |
| `defaultCollapsed` | `boolean` | `false` | Start collapsed |
| `maxHeight` | `string` | `'500px'` | Max height before scrolling |
| `className` | `string` | - | Additional CSS classes |

---

## Usage Patterns

### Pattern 1: Basic Demo Structure

```tsx
<DemoArticle metadata={metadata}>
  <ArticleSection theme="cubit">
    <SectionHeader>Introduction</SectionHeader>
    <Prose>
      <p>Welcome to this demo...</p>
    </Prose>
  </ArticleSection>

  <ArticleSection>
    <SectionHeader>Interactive Example</SectionHeader>
    <MyInteractiveDemo />
  </ArticleSection>

  <ArticleSection>
    <SectionHeader>Implementation</SectionHeader>
    <CodePanel code={sourceCode} language="typescript" />
  </ArticleSection>
</DemoArticle>
```

### Pattern 2: Side-by-Side Comparison

```tsx
<ArticleSection>
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <h3>Cubit</h3>
      <CodePanel code={cubitCode} language="typescript" />
    </div>
    <div>
      <h3>Bloc</h3>
      <CodePanel code={blocCode} language="typescript" />
    </div>
  </div>
</ArticleSection>
```

### Pattern 3: Scrollytelling (Sticky Section)

```tsx
<div className="grid lg:grid-cols-2 gap-8">
  <div>
    <ArticleSection>
      <Prose>
        <p>As you read, watch the state change...</p>
      </Prose>
    </ArticleSection>
  </div>

  <div className="lg:sticky lg:top-24 lg:self-start">
    <StateViewer bloc={CounterCubit} title="Live State" />
  </div>
</div>
```

### Pattern 4: Progressive Reveal

```tsx
<ArticleSection>
  <Prose>
    <h2>Step 1: Create the Cubit</h2>
    <p>First, let's define our Cubit...</p>
  </Prose>
  <CodePanel code={step1Code} language="typescript" />
</ArticleSection>

<ArticleSection>
  <Prose>
    <h2>Step 2: Use in React</h2>
    <p>Now we can use it in a component...</p>
  </Prose>
  <CodePanel code={step2Code} language="typescript" />
</ArticleSection>
```

## Design Tokens

Components automatically use design tokens defined in Tailwind config:

### Concept Colors
- **Cubit**: Blue (`concept-cubit`)
- **Bloc**: Purple (`concept-bloc`)
- **Event**: Orange (`concept-event`)

### Semantic Colors
- **Tip**: Blue (`semantic-tip`)
- **Warning**: Yellow (`semantic-warning`)
- **Success**: Green (`semantic-success`)
- **Info**: Purple (`semantic-info`)
- **Danger**: Red (`semantic-danger`)

## Accessibility

All components follow accessibility best practices:

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Color is not the only indicator (icons, labels, patterns)
- Respect `prefers-reduced-motion` media query

## Animation

Components use Framer Motion for smooth animations:

- **Entrance animations**: Fade in, slide up on scroll
- **State transitions**: Pulse animation on state changes
- **Interactive feedback**: Hover, tap animations
- **Respect reduced motion**: All animations respect user preference

## Best Practices

1. **Always wrap demos in `<DemoArticle>`** - This enforces consistency and provides required structure

2. **Use sections to group content** - Break content into logical sections with appropriate themes

3. **Limit prose width** - Keep text readable (60-80 characters per line)

4. **Highlight important code** - Use `highlightLines` and `lineLabels` to draw attention

5. **Provide context** - Use `Prose` to explain concepts before showing code

6. **Progressive complexity** - Start simple, reveal complexity gradually

7. **Test on mobile** - Ensure demos work on small screens

8. **Use color strategically** - Match section themes to concepts being taught

## Common Mistakes

❌ **Don't** skip the `DemoArticle` wrapper
✅ **Do** always use `<DemoArticle metadata={...}>` as the outermost component

❌ **Don't** use inconsistent colors for the same concept
✅ **Do** use `theme="cubit"` consistently for all Cubit-related sections

❌ **Don't** create walls of text or code
✅ **Do** break content into digestible sections with visuals

❌ **Don't** forget about mobile users
✅ **Do** test responsive behavior and touch interactions

## Next Steps

See `/components/shared/README.md` for additional shared components like:
- `StateViewer` - Live state display
- `BlocGraphVisualizer` - Instance graph visualization
- `ConceptCallout` - Highlighted tips and warnings
- `ComparisonPanel` - Side-by-side comparisons

## Examples

Complete example demos can be found in:
- `/demos/01-fundamentals/simple-counter` - Basic demo structure
- `/demos/02-core-concepts/bloc-vs-cubit` - Comparison pattern
