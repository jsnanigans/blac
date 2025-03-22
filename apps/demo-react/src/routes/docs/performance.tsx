import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/performance')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/docs/performance"!</div>
}
