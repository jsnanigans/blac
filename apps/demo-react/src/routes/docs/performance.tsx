import { createFileRoute } from '@tanstack/react-router'
import DocCode from '../../components/CodeHighlighter';
import DocSection from '../../components/DocSection';

export const Route = createFileRoute('/docs/performance')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div />;
}
```

Then, to insert the content inside the `RouteComponent`:

apps/demo-react/src/routes/docs/performance.tsx
```typescript
<<<<<<< SEARCH
function RouteComponent() {
  return (
    <div />;
}
