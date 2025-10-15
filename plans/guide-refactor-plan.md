# Guide Demos & Articles Refactor Plan

## Executive Summary

This plan outlines a comprehensive refactoring and updating strategy for all demos and articles in the BlaC playground guide. The goal is to ensure consistency, completeness, and high quality across all learning materials.

## Current State Analysis

### What We Have
- **28 MDX articles** currently exist across 5 sections
- **31 registered demos** in the demo registry
- New infrastructure in place:
  - Syntax highlighting with `react-syntax-highlighter`
  - `DemoPreview` component for embedding live demos
  - Custom MDX components for consistent styling
  - `GuideArticleNote` for callouts and warnings

### Quality Levels
Based on inspection, the current articles fall into three categories:

**High Quality (2 articles):**
- `hello-world.mdx` - Comprehensive, well-structured, includes demo preview
- `event-design.mdx` - Extensive, includes best practices and anti-patterns, does not yet have demo preview

**Medium Quality (3 articles):**
- `counter.mdx` - Good content but missing demo preview
- Several others with basic structure

**Low Quality/Placeholder (23 articles):**
- Most articles have basic structure but lack:
  - Live demo embeds
  - Code examples with syntax highlighting
  - Practical examples
  - Comprehensive explanations
  - GuideArticleNote callouts

## Refactoring Goals

### 1. Consistency
- **Standardized Structure**: Every article should follow the same pattern
- **Visual Consistency**: Use custom components throughout
- **Tone & Voice**: Maintain friendly, educational tone
- **Code Style**: Consistent formatting and commenting

### 2. Completeness
- **Live Demos**: Every article must embed its demo using `<DemoPreview>`
- **Code Examples**: All code blocks with proper syntax highlighting
- **Callouts**: Use `GuideArticleNote` for tips, warnings, best practices
- **Related Content**: Link to relevant demos and concepts

### 3. Quality
- **Depth**: Explain not just "how" but "why"
- **Examples**: Provide multiple real-world examples
- **Anti-Patterns**: Show what NOT to do (like event-design.mdx)
- **Type Safety**: Emphasize TypeScript best practices
- **Testing**: Include testability considerations where appropriate

## Standard Article Structure

Every article should follow this template:

```mdx
export const demoId = 'demo-name';
export const sectionId = 'section-name';

## Introduction

Brief overview of what this demo teaches (2-3 sentences).

### What You'll Learn
- Bullet point 1
- Bullet point 2
- Bullet point 3

## Core Concept Explanation

Detailed explanation of the main concept with:
- Clear definitions
- Why it matters
- When to use it

## Code Example

```typescript
// Well-commented code example
class ExampleCubit extends Cubit<State> {
  // Implementation
}
```

### Key Points

<GuideArticleNote title="Important">
Critical information or common pitfalls
</GuideArticleNote>

## Using in React

```tsx
// React component example
function Component() {
  const [state, cubit] = useBloc(ExampleCubit);
  // ...
}
```

## Try It Out

See the live example in action:

<DemoPreview demoId="demo-name" />

## Common Patterns / Best Practices

- Pattern 1
- Pattern 2
- Pattern 3

## Common Pitfalls / Anti-Patterns

<GuideArticleNote title="Warning" className="border-red-200...">
Things to avoid and why
</GuideArticleNote>

## Real-World Example

A practical use case demonstrating the concept.

## Key Takeaways

- Takeaway 1
- Takeaway 2
- Takeaway 3

## Next Steps

What to learn next, with links to related demos.
```

## Section-by-Section Refactoring Plan

### Phase 1: Getting Started (6 articles)
**Priority: HIGH** - These are the first impression for users

1. **hello-world** ✅ - DONE (template reference)
   - Status: Complete, use as reference

2. **counter** ✅ - COMPLETE
   - Added `<CounterInteractive>` embed
   - Added critical warning callout for arrow functions with code examples
   - Added info callout for patch() vs emit()
   - Significantly expanded TypeScript benefits section (4 subsections)
   - Upgraded from Grade B to Grade A quality

3. **reading-state** ✅ - COMPLETE
   - Complete rewrite from placeholder
   - Comprehensive explanation of shared state by default
   - Multiple components reading same Cubit example
   - Dependency tracking and fine-grained reactivity
   - No prop drilling comparison
   - 3 common patterns (Display-Only, Controller, Dashboard)
   - 8 code blocks with TypeScript
   - 2 callouts (Shared by Default, Performance Note)
   - DemoPreview embed
   - Upgraded to Grade A quality (~1,300 words)

4. **updating-state** ✅ - COMPLETE
   - Complete rewrite from placeholder
   - Comprehensive emit() vs patch() comparison
   - Interactive demo with visual diff viewer
   - Shallow merge trap explained with code examples
   - 3 real-world examples (forms, API, counters)
   - Performance considerations covered
   - Deep nesting guidance
   - Comparison table + 4 callouts
   - 10+ code blocks
   - Upgraded to Grade A quality (~1,500 words)

5. **multiple-components** ✅ - COMPLETE
   - Complete rewrite from placeholder
   - Comprehensive coverage of component composition patterns
   - 4 distinct patterns (Parent Controls/Children Display, Siblings Coordinate, Layout with Smart Children, Conditional Rendering)
   - Shopping cart example with 4 coordinated components
   - Form handling pattern
   - Filter/search coordination pattern
   - Prop drilling elimination comparison (traditional vs BlaC)
   - Real-world Todo app example with 5 components
   - 15+ code blocks with TypeScript
   - 2 callouts
   - Upgraded to Grade A quality (~2,000 words)

6. **instance-management** ✅ - COMPLETE
   - Complete rewrite from placeholder
   - Created `InstanceManagementInteractive` component with shared vs isolated demo
   - Comprehensive coverage of shared (default), isolated, custom IDs, and keep-alive patterns
   - Decision matrix flowchart for choosing instance strategy
   - 3 real-world examples (Form Field, Shopping Cart, Multi-Workspace Chat)
   - Memory management lifecycle table
   - 12+ code blocks with TypeScript
   - 5 callouts (Why Shared, Rule of Thumb, When to Use IDs, Use Keep-Alive Sparingly, Automatic Cleanup)
   - 3 comparison tables
   - Upgraded to Grade A quality (~2,200 words)

### Phase 2: Core Concepts (5 articles)
**Priority: MEDIUM** - Building on fundamentals

7. **cubit-deep-dive** ✅ - COMPLETE
   - Created comprehensive deep dive (~2,900 words)
   - Covers immutability, nested state, computed properties, async patterns
   - Interactive demo with 3 sections (nested state, computed, async)
   - 20+ code blocks with TypeScript
   - 7 callouts including critical flat state recommendations
   - Testing section with practical examples
   - Performance optimization section
   - Corrected to emphasize flat state and dependency tracking limitations
   - Upgraded to Grade A quality

8. **bloc-deep-dive** ✅ - COMPLETE
   - Comprehensive event-driven pattern explanation (~2,600 words)
   - Created BlocDeepDiveInteractive with 3 demos (counter, form, async)
   - Event classes, handlers, and dispatch patterns
   - Async event processing with multiple emissions
   - Event transformation (debouncing, cancellation)
   - Testing section with Vitest examples
   - Blocs vs Cubits comparison table
   - 15+ code blocks, 5 callouts
   - Emphasizes flat state and correct lifecycle behaviors
   - Upgraded to Grade A quality

9. **bloc-vs-cubit** 📝 - NEEDS REWRITE
   - Decision matrix
   - When to use each
   - Migration paths
   - Real-world scenarios

10. **computed-properties** 📝 - NEEDS REWRITE
    - Getters pattern
    - Memoization considerations
    - Performance implications
    - Best practices

11. **lifecycle** 📝 - NEEDS REWRITE
    - Component lifecycle integration
    - Cleanup patterns
    - Resource management
    - Memory leak prevention

### Phase 3: Patterns (11 articles)
**Priority: MEDIUM** - Practical applications

12. **simple-form** 📝 - NEEDS REWRITE
    - Basic form handling
    - Input binding
    - Form state management
    - Simple validation

13. **form-validation** 📝 - NEEDS REWRITE
    - Complex validation rules
    - Async validation
    - Error messaging
    - Validation libraries integration

14. **async-loading** 📝 - NEEDS REWRITE
    - Loading states pattern
    - Error handling
    - Retry logic
    - Loading indicators

15. **data-fetching** 📝 - NEEDS REWRITE
    - API integration
    - Caching strategies
    - Pagination
    - Optimistic updates

16. **list-management** 📝 - NEEDS REWRITE
    - CRUD operations
    - List state management
    - Filtering and sorting
    - Bulk operations

17. **filtering-sorting** 📝 - NEEDS REWRITE
    - Filter patterns
    - Sort algorithms
    - Search functionality
    - Performance optimization

18. **event-design** 📝 - NEEDS Demos
    - Status: Complete and comprehensive
    - Add demo embed if not present

19. **todo-bloc** 📝 - NEEDS REWRITE
    - Complete TODO app
    - Best practices in action
    - Multiple patterns combined
    - Real-world complexity

20. **keep-alive** 📝 - NEEDS REWRITE
    - KeepAlive pattern explained
    - Use cases
    - Memory considerations
    - Implementation details

21. **props** 📝 - NEEDS REWRITE
    - Props-based Blocs
    - Dynamic instances
    - Keying strategies
    - Common use cases

22. **persistence** 📝 - NEEDS REWRITE
    - State persistence
    - Storage strategies
    - Hydration patterns
    - Plugin integration

### Phase 4: Advanced (5 articles)
**Priority: LOW** - For experienced users

23. **async-operations** ✅ - COMPLETE
    - Comprehensive async patterns guide (~3,500 words)
    - Created AsyncOperationsInteractive component with 4 demos (debounced search, race conditions, retry+backoff, parallel vs sequential)
    - Debouncing pattern with timer cleanup
    - Cancellation with AbortController
    - Race condition handling with request IDs
    - Retry logic with exponential backoff strategy
    - Parallel vs sequential execution comparison
    - Error handling patterns (optimistic updates, error recovery)
    - Testing async operations with fake timers
    - 2 real-world examples (autocomplete, infinite scroll)
    - 15+ code blocks with TypeScript
    - 4 callouts (Cleanup, AbortController support, Request ID vs AbortController, Production Considerations, Best Practices)
    - Comparison tables for parallel/sequential trade-offs
    - Upgraded to Grade A quality

24. **custom-selectors** ✅ - COMPLETE
    - Comprehensive selector optimization guide (~3,400 words)
    - Created CustomSelectorsInteractive component with 5 demos (no selector, basic selector, derived values, custom equality, computed properties)
    - Basic selector patterns (single property, multiple properties, arrays)
    - Derived values and memoization strategies
    - Custom equality functions (shallow vs deep comparison)
    - Selector function signature (state, previous, instance)
    - Performance optimization strategies
    - 3 real-world examples (shopping cart summary, filtered lists, user permissions)
    - Testing selectors and re-render behavior
    - Selectors vs Dependencies comparison
    - 20+ code blocks with TypeScript
    - 4 callouts (How Selectors Work, Object Identity, Performance Warning, Prefer Selectors, Best Practices)
    - Common pitfalls section
    - Upgraded to Grade A quality

25. **stream** 📝 - NEEDS REWRITE
    - Stream integration
    - Observable patterns
    - Event streams
    - Reactive programming

26. **bloc-composition** 📝 - NEEDS REWRITE
    - Multiple Blocs interaction
    - Communication patterns
    - Dependency injection
    - Architecture patterns

27. **dependencies** 📝 - NEEDS REWRITE
    - Dependency injection
    - Service location
    - Testing with dependencies
    - Mocking strategies

### Phase 5: Plugins (1 article)
**Priority: LOW** - Extension points

28. **custom-plugins** ✅ - COMPLETE
    - Comprehensive plugin system guide (~3,400 words)
    - Created CustomPluginsInteractive component with 4 plugin examples (analytics, performance, validation, logging)
    - BlacPlugin interface and lifecycle hooks explanation
    - System-level vs Bloc-level plugins
    - 4 real-world plugin implementations (analytics tracking, performance monitoring, state validation, state history)
    - Testing plugins section with Vitest examples
    - Performance considerations and batching patterns
    - Conditional registration (dev/prod/feature-flags)
    - 20+ code blocks with TypeScript
    - 2 callouts (Lifecycle Hook Guarantees, Best Practices, Don'ts)
    - Upgraded to Grade A quality

## Implementation Strategy

### Week 1: Templates & Infrastructure
- [ ] Create article template file
- [ ] Create checklist for article quality
- [ ] Set up automated checks (length, sections, etc.)
- [ ] Document MDX component usage patterns

### Week 2-3: Phase 1 - Getting Started
- [ ] Refactor counter.mdx
- [ ] Rewrite reading-state.mdx
- [ ] Rewrite updating-state.mdx
- [ ] Rewrite multiple-components.mdx
- [ ] Rewrite instance-management.mdx
- [ ] Review and polish all Phase 1 articles

### Week 4-5: Phase 2 - Core Concepts
- [ ] Rewrite all 5 core concept articles
- [ ] Cross-link between related concepts
- [ ] Add comprehensive examples

### Week 6-8: Phase 3 - Patterns
- [ ] Rewrite all 11 pattern articles
- [ ] Ensure real-world examples
- [ ] Add troubleshooting sections

### Week 9: Phase 4 - Advanced
- [ ] Rewrite all 5 advanced articles
- [ ] Add performance considerations
- [ ] Include architecture guidance

### Week 10: Phase 5 - Plugins & Polish
- [ ] Rewrite plugins article
- [ ] Final review of all articles
- [ ] Consistency pass
- [ ] User testing

## Quality Checklist

Each article must have:

### Structure
- [ ] Export statements for demoId and sectionId
- [ ] Introduction section
- [ ] "What You'll Learn" section
- [ ] Core concept explanation
- [ ] Code examples with syntax highlighting
- [ ] "Try It Out" section with DemoPreview
- [ ] Key takeaways section
- [ ] Next steps section

### Content
- [ ] Clear, concise explanations
- [ ] Real-world examples
- [ ] At least 2-3 code blocks with syntax highlighting
- [ ] At least 1 GuideArticleNote (tip, warning, or info)
- [ ] TypeScript best practices highlighted
- [ ] Common pitfalls or anti-patterns mentioned
- [ ] **Interactive component extracted** (not using DemoPreview which embeds full article)

### Quality
- [ ] No spelling/grammar errors
- [ ] Consistent voice and tone
- [ ] Accurate technical information
- [ ] Code examples are tested and working
- [ ] Links to related demos work correctly
- [ ] Mobile-friendly formatting

### Components
- [ ] All code blocks use proper language tags
- [ ] DemoPreview embedded correctly
- [ ] GuideArticleNote used appropriately
- [ ] Related demos listed at bottom
- [ ] Proper headings hierarchy (## for main, ### for sub)

## Style Guidelines

### Writing Style
- **Tone**: Friendly, encouraging, educational
- **Person**: Second person ("you") for instructions
- **Active Voice**: Prefer active over passive voice
- **Brevity**: Clear and concise, avoid fluff
- **Examples**: Show, don't just tell

### Code Style
- **Arrow Functions**: Always use arrow functions in Blocs/Cubits
- **TypeScript**: Always include types
- **Comments**: Explain the "why", not the "what"
- **Naming**: Descriptive, conventional names
- **Formatting**: Consistent indentation and spacing

### MDX Conventions
- **Exports First**: demoId and sectionId at top
- **Code Fences**: Always include language (```typescript, ```tsx, ```javascript)
- **Components**: Use angle brackets for custom components (`<DemoPreview />`)
- **Spacing**: Blank line before and after code blocks
- **Links**: Use markdown links for internal navigation

## Success Metrics

### Quantitative
- 28 articles fully refactored
- 100% of articles include live demos
- 100% of articles have 3+ code examples
- 100% of articles have at least 1 callout
- Average article length: 800-1500 words

### Qualitative
- User feedback indicates improved clarity
- Reduced questions in community channels
- Higher completion rates for learning path
- Positive feedback on examples and demos

## Resources Needed

### Time Estimates
- Template creation: 2 hours
- Phase 1 (6 articles): 24 hours (4 hours each)
- Phase 2 (5 articles): 20 hours (4 hours each)
- Phase 3 (11 articles): 44 hours (4 hours each)
- Phase 4 (5 articles): 20 hours (4 hours each)
- Phase 5 (1 article): 4 hours
- Review & Polish: 16 hours
- **Total: ~130 hours**

### Tools
- MDX editor with preview
- Code formatter (Prettier)
- Spell checker
- Link checker
- Demo test runner

### Reference Materials
- event-design.mdx (excellent example)
- hello-world.mdx (complete template)
- counter.mdx (good structure)
- BlaC documentation
- TypeScript handbook

## Risk Mitigation

### Potential Issues
1. **Inconsistency**: Different authors may have different styles
   - **Mitigation**: Use detailed style guide and templates

2. **Technical Accuracy**: Code examples may break with updates
   - **Mitigation**: Automated testing of code examples

3. **Scope Creep**: Articles becoming too long
   - **Mitigation**: Stick to 800-1500 word target

4. **Demo Availability**: Some demos may not exist yet
   - **Mitigation**: Create missing demos first or use placeholders

## Next Steps

1. **Review this plan** with team
2. **Assign ownership** for each phase
3. **Create templates** and style guide
4. **Begin Phase 1** with getting-started section
5. **Establish review process** for completed articles
6. **Set up progress tracking** dashboard

---

## Appendix: Article Status Tracking

### Phase 1: Getting Started (Progress: 6/6 - 100% ✅)
- ✅ hello-world - Complete
- ✅ counter - Complete
- ✅ reading-state - Complete
- ✅ updating-state - Complete
- ✅ multiple-components - Complete
- ✅ instance-management - Complete

### Phase 2: Core Concepts (Progress: 5/5 - 100% ✅)
- ✅ cubit-deep-dive - Complete
- ✅ bloc-deep-dive - Complete
- ✅ bloc-vs-cubit - Complete (~2,100 words with decision matrix, migration paths, testing comparison)
- ✅ computed-properties - Complete (~2,400 words with shopping cart demo, performance guidance, getter patterns)
- ✅ lifecycle - Complete (~3,000 words with mount/unmount demos, instance patterns, cleanup guidance)

### Phase 3: Patterns (Progress: 11/11 - 100% ✅)
- ✅ simple-form - Complete (~2,200 words with contact form and newsletter examples)
- ✅ form-validation - Complete (~2,900 words with async validation, password strength, touch state)
- ✅ async-loading - Complete (~2,800 words with state machine, retry+backoff, optimistic updates)
- ✅ data-fetching - Complete (~2,700 words with caching, SWR, pagination patterns)
- ✅ list-management - Complete (~2,500 words with CRUD, event-driven filtering, bulk operations)
- ✅ filtering-sorting - Complete (~2,900 words with multi-field search, price range, dynamic sorting, performance optimization)
- ✅ event-design - Complete (Article was excellent, added EventDesignInteractive component with 6 good patterns + 4 anti-patterns)
- ✅ todo-bloc - Complete (~3,000 words comprehensive Todo app with 8 event types, computed properties, testing, performance guidance)
- ✅ keep-alive - Complete (~3,500 words with lifecycle explanation, auth/cart/WebSocket examples, memory considerations, testing guidance)
- ✅ props - Complete (~3,000 words with timer examples, staticProps usage, API client/form validator patterns, props vs state distinction)
- ✅ persistence - Complete (~3,400 words with basic/selective persistence, security guidance, localStorage/sessionStorage/IndexedDB, versioning, testing)

### Phase 4: Advanced (Progress: 5/5 - 100% ✅)
- ✅ async-operations - Complete (~3,500 words with debouncing, cancellation, race conditions, retry+backoff, parallel/sequential patterns, testing)
- ✅ custom-selectors - Complete (~3,400 words with selector patterns, memoization, equality functions, computed properties, testing, real-world examples)
- ✅ stream - Complete (~2,900 words with WebSocket patterns, buffer management, SSE, real-world examples)
- ✅ bloc-composition - Complete (~3,200 words with 3 composition patterns, shopping cart/analytics examples, testing guidance, architecture guidelines)
- ✅ dependencies - Complete (~3,100 words with dependency tracking, computed dependencies, dashboard/form examples, testing, debugging)

### Phase 5: Plugins (Progress: 1/1 - 100% ✅)
- ✅ custom-plugins - Complete (~3,400 words with analytics/performance/validation/logging plugin examples, lifecycle hooks, testing, production patterns)

**Status Key:**
- ✅ Complete - High quality, no changes needed
- 🔨 Needs Update - Good foundation, minor updates needed
- 📝 Needs Rewrite - Placeholder or low quality, requires full rewrite
