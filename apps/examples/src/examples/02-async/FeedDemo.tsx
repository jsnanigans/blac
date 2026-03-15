import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card, Button, RenderCounter, Alert } from '../../shared/components';
import { FeedCubit, AUTHORS, type Article } from './FeedCubit';

function AuthorTabs() {
  const [state, bloc] = useBloc(FeedCubit);
  // Tracks state.authorId — only re-renders when selected author changes
  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="AuthorTabs" />
      <div className="author-tabs">
        {AUTHORS.map((author) => (
          <button
            key={author.id}
            className={`ghost author-tab${state.authorId === author.id ? ' active' : ''}`}
            onClick={() => void bloc.loadAuthor(author.id)}
          >
            {author.name}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted" style={{ marginTop: '6px' }}>
        Does not re-render when posts load — only tracks <code>authorId</code>.
      </p>
    </div>
  );
}

function LoadStatus() {
  const [state, bloc] = useBloc(FeedCubit);
  // Tracks state.status and state.error — re-renders on every status change
  return (
    <div style={{ position: 'relative', minHeight: '1.5rem' }}>
      <RenderCounter name="LoadStatus" />
      {state.status === 'loading' && (
        <p className="text-small text-muted">Loading posts...</p>
      )}
      {state.status === 'error' && (
        <div className="stack-xs">
          <Alert variant="danger">{state.error}</Alert>
          <Button
            variant="ghost"
            onClick={bloc.retry}
            style={{ alignSelf: 'flex-start', fontSize: '0.8125rem', padding: '6px 12px' }}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function ArticleList() {
  const [state] = useBloc(FeedCubit);
  // Tracks state.author and state.articles — only re-renders when posts arrive

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="ArticleList" />
      {!state.author ? (
        <p className="text-small text-muted" style={{ padding: '0.5rem 0' }}>
          Waiting for posts...
        </p>
      ) : (
        <div className="stack-md">
          <div>
            <h3 style={{ marginBottom: '2px' }}>{state.author.name}</h3>
            <p className="text-small text-muted" style={{ marginBottom: 0 }}>
              {state.author.role}
            </p>
          </div>
          <div className="stack-sm">
            {state.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <div className="article-card">
      <div className="article-body">
        <h4 className="article-title">{article.title}</h4>
        <p className="article-preview">{article.preview}</p>
      </div>
      <span className="article-read-time">{article.readTime} min read</span>
    </div>
  );
}

export function FeedDemo() {
  // Owns the FeedCubit instance and triggers the initial load.
  // autoTrack: false means this component never re-renders from state.
  const [, bloc] = useBloc(FeedCubit, {
    autoTrack: false,
    onMount: (b) => void b.loadAuthor(AUTHORS[0].id),
  });

  return (
    <ExampleLayout
      title="Async Data"
      description="Loading, error, and retry patterns for async operations. Three components share one FeedCubit but track different slices of state, so each re-renders independently."
      features={[
        'loadAuthor() is async — switching authors immediately cancels the previous request via request ID',
        'AuthorTabs only re-renders when the selected author changes, not when posts load',
        'LoadStatus only re-renders on status transitions: idle → loading → success/error',
        'ArticleList only re-renders when the articles array actually changes',
      ]}
    >
      <section className="stack-lg">
        <Card>
          <AuthorTabs />
        </Card>

        <div className="grid grid-cols-2 gap-md">
          <div className="stack-md">
            <LoadStatus />
            <ArticleList />
          </div>

          <Card>
            <h4>Key Concepts</h4>
            <div className="stack-xs text-small text-muted">
              <p>
                <strong>Request cancellation:</strong> Each{' '}
                <code>loadAuthor()</code> increments an internal{' '}
                <code>_reqId</code>. When the async call resolves, it checks if
                its ID is still current. Switching authors mid-flight silently
                drops the stale response.
              </p>
              <p>
                <strong>Granular re-renders:</strong> Watch the render badges.
                Switching authors: all three fire. Posts arriving:{' '}
                <code>ArticleList</code> and <code>LoadStatus</code> fire,{' '}
                <code>AuthorTabs</code> stays still because{' '}
                <code>authorId</code> didn't change.
              </p>
              <p>
                <strong>Error + retry:</strong> ~30% of fetches fail with a
                simulated timeout. <code>retry()</code> re-calls{' '}
                <code>loadAuthor</code> using the current{' '}
                <code>authorId</code> stored in state — no props or closures
                needed.
              </p>
              <p>
                <strong>autoTrack: false:</strong> The parent{' '}
                <code>FeedDemo</code> component uses{' '}
                <code>autoTrack: false</code> to own the Cubit lifecycle and
                trigger the initial load without subscribing to state updates.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </ExampleLayout>
  );
}
