# Plan: Guide Navigation System

## Decision

**Approach**: Implement a documentation-style guide layout with sidebar navigation, learning path support, and progressive disclosure
**Why**: Users need a structured learning experience that guides them from basics to advanced concepts with clear navigation
**Risk Level**: Low

## Implementation Steps

1. **Create Guide Layout Components** - Build `/guide` route structure with sidebar and navigation
2. **Implement Guide Router** - Add routes `/guide` and `/guide/:section/:demoId` to App.tsx
3. **Build Sidebar Navigation** - Create collapsible sidebar with sections and progress tracking
4. **Create Landing Page** - Design guide overview with learning path visualization
5. **Add Navigation Controls** - Implement breadcrumbs and previous/next buttons
6. **Update Demo Registry** - Extend registry with guide metadata (section mapping, order)
7. **Implement Responsive Design** - Add mobile-friendly collapsible navigation
8. **Add Redirect Logic** - Redirect old `/demos` routes to new `/guide` structure

## Files to Change

### New Files to Create
- `apps/playground/src/pages/GuidePage.tsx` - Main guide landing page
- `apps/playground/src/pages/GuideDemo.tsx` - Demo viewer with guide layout
- `apps/playground/src/layouts/GuideLayout.tsx` - Layout wrapper for guide pages
- `apps/playground/src/components/guide/GuideSidebar.tsx` - Navigation sidebar
- `apps/playground/src/components/guide/GuideNavigation.tsx` - Prev/Next navigation
- `apps/playground/src/components/guide/GuideBreadcrumb.tsx` - Breadcrumb component
- `apps/playground/src/components/guide/GuideLanding.tsx` - Landing page content
- `apps/playground/src/components/guide/GuideSection.tsx` - Section component for sidebar
- `apps/playground/src/core/utils/guideStructure.ts` - Guide metadata and structure

### Files to Modify
- `apps/playground/src/App.tsx` - Add guide routes
- `apps/playground/src/core/utils/demoRegistry.ts` - Add guide-specific methods
- `apps/playground/src/pages/DemosPage.tsx` - Add redirect to guide

## Detailed Component Structure

### 1. GuideLayout Component
```typescript
interface GuideLayoutProps {
  children: React.ReactNode;
  currentDemoId?: string;
}

// Features:
- Sticky sidebar (collapsible on mobile)
- Main content area with max-width
- Responsive breakpoints
- Smooth transitions
```

### 2. GuideSidebar Component
```typescript
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  demos: Array<{
    id: string;
    title: string;
    sequence: number;
    completed?: boolean;
  }>;
}

// Features:
- Collapsible sections
- Active demo highlighting
- Progress indicators
- Search/filter capability (phase 2)
- Mobile hamburger menu
```

### 3. Navigation Structure
```typescript
const guideStructure = {
  sections: [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: '🚀',
      category: '01-basics',
      demos: [
        'hello-world',
        'counter',
        'reading-state',
        'updating-state',
        'multiple-components',
        'instance-management'
      ]
    },
    {
      id: 'core-concepts',
      title: 'Core Concepts',
      icon: '🎯',
      category: '02-core-concepts',
      demos: [
        'cubit-deep-dive',
        'bloc-deep-dive',
        'bloc-vs-cubit',
        'computed-properties',
        'lifecycle'
      ]
    },
    // ... more sections
  ]
};
```

### 4. Route Structure
```
/guide                          → Landing page with overview
/guide/getting-started          → Section overview (optional)
/guide/getting-started/hello-world → Individual demo
/guide/core-concepts/cubit-deep-dive → Individual demo
```

## Acceptance Criteria

- [ ] `/guide` route displays landing page with all sections
- [ ] `/guide/:section/:demoId` displays demo with guide layout
- [ ] Sidebar navigation works with highlighting and collapsing
- [ ] Previous/Next navigation follows learning path
- [ ] Breadcrumbs show correct hierarchy
- [ ] Mobile responsive with collapsible menu
- [ ] Old `/demos` routes redirect to `/guide`
- [ ] TypeScript compilation passes
- [ ] Existing demos work unchanged in new layout

## Risks & Mitigations

**Main Risk**: Breaking existing demo functionality
**Mitigation**: Wrap existing DemoArticle components without modification, test each demo

**Secondary Risk**: Complex routing with nested paths
**Mitigation**: Use simple two-level routing (/guide/:section/:demoId) instead of deeper nesting

## Out of Scope

- User progress tracking/persistence
- Search functionality (add in phase 2)
- Table of contents for individual articles (already exists in DemoArticle)
- Authentication or user accounts
- Demo completion tracking in database