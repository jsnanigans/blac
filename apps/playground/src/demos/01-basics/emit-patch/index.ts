import { DemoRegistry } from '@/core/utils/demoRegistry';
import { EmitPatchDemo } from './EmitPatchDemo';
// eslint-disable-next-line import/no-unused-modules

DemoRegistry.register({
  id: 'emit-patch',
  category: '01-basics',
  title: 'Emit vs Patch',
  description:
    'Learn the fundamental difference between emit() and patch() methods for updating state in BlaC.',
  difficulty: 'beginner',
  tags: ['emit', 'patch', 'state', 'updates', 'basics'],
  concepts: ['state updates', 'shallow merge', 'state replacement'],
  component: EmitPatchDemo,
  code: {
    demo: '',
  },
  tests: [
    {
      name: 'emit replaces entire state',
      run: () => true,
      description: 'Verifies emit() replaces the complete state object',
    },
    {
      name: 'patch merges with existing state',
      run: () => true,
      description: 'Verifies patch() performs shallow merge',
    },
  ],
  relatedDemos: ['counter', 'loading-states'],
  prerequisites: ['counter'],
  documentation: `
## Emit vs Patch

The two fundamental methods for updating state in BlaC:

### emit(newState)
- **Replaces** the entire state object
- Must provide all required fields
- Type-safe - TypeScript ensures complete state
- Use for: resets, complete replacements

### patch(partialState)
- **Merges** with existing state (shallow)
- Only specify fields to update
- Other fields remain unchanged
- Use for: partial updates, most common case

### Important: Shallow Merge
patch() only merges one level deep. For nested objects:

\`\`\`typescript
// ❌ Wrong - loses other nested properties
this.patch({
  settings: { theme: 'dark' }
});

// ✅ Correct - preserve nested properties
this.patch({
  settings: {
    ...this.state.settings,
    theme: 'dark'
  }
});
\`\`\`
`,
});
