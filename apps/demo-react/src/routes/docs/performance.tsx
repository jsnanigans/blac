import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/performance')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <h1>Performance in blac-react and blac-next</h1>
      <p>
        The blac-react and blac-next libraries are designed with performance in mind.
        They provide efficient state management through features like dependency detection,
        selective re-renders, and concurrent event processing.
      </p>
      <h2>Efficient State Management</h2>
      <p>
        With fine-grained control over state updates and optimized event processing,
        applications built with these libraries maintain high performance even as they
        scale in complexity.
      </p>
      <h2>Optimized Rendering</h2>
      <p>
        Leveraging React's optimizations and memoization techniques,
        blac-react minimizes unnecessary re-renders, ensuring your UI remains smooth.
      </p>
      <h2>Scalable Architecture</h2>
      <p>
        The blac-next framework abstracts state management in a way that scales with application complexity,
        making it easier to manage and update state across large codebases.
      </p>
    </div>
  );
}
