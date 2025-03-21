import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/docs/')({
  component: DocsIndexPage,
});

function DocsIndexPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <div className="mb-10">
        <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent inline-block text-5xl font-bold mb-6">
          Blac Documentation
        </h1>
      </div>
    </div>
  );
}