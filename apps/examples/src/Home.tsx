import { Link } from './router';
import { exampleCatalog } from './exampleCatalog';

const quickFacts = [
  {
    label: 'Start here',
    value: 'Counter → Async → Todo',
    detail: 'Learn the reactive primitives in a clean order.',
  },
  {
    label: 'What scales',
    value: 'Dashboard + Registry',
    detail: 'See plugins, dependency wiring, and instance introspection.',
  },
  {
    label: 'Full surface',
    value: 'Messenger',
    detail: 'Named instances, coordination, and persistence in one app.',
  },
];

const recommendedPath = ['Counter', 'Async Data', 'Todo List', 'Messenger'];

export function Home() {
  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-hero__copy">
          <span className="badge primary">BlaC Examples</span>
          <h1>Pattern-first demos with enough polish to feel real.</h1>
          <p>
            These examples are arranged like a guided tour. The early screens
            teach the primitives, the middle set shows coordination and
            persistence, and the final app proves the patterns still read well
            once the surface gets busy.
          </p>
        </div>

        <aside className="home-hero__panel">
          <span className="home-hero__panel-label">Suggested route</span>
          <div className="home-route-list">
            {recommendedPath.map((step, index) => (
              <div key={step} className="home-route-list__item">
                <span className="home-route-list__index">{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </aside>
      </header>

      <section className="home-intel-grid">
        {quickFacts.map((fact) => (
          <article key={fact.label} className="home-intel-card">
            <span className="home-intel-card__label">{fact.label}</span>
            <h2>{fact.value}</h2>
            <p>{fact.detail}</p>
          </article>
        ))}
      </section>

      <section className="home-section-heading">
        <div className="stack-sm">
          <span className="home-section-heading__eyebrow">Choose a route</span>
          <h2>Eight examples, from fundamentals to app-scale state</h2>
        </div>
        <p>
          Open any card to inspect one architectural idea in isolation, then
          move laterally once you want to compare patterns.
        </p>
      </section>

      <div className="examples-grid">
        {exampleCatalog.map((example) => (
          <Link key={example.path} to={example.path} className="example-card">
            <div className="example-card__header">
              <div className="stack-xs">
                <span className="example-card__index">{example.id}</span>
                <span className="example-card__category">
                  {example.category}
                </span>
              </div>
              <span
                className={`badge ${example.badge === 'Advanced' ? 'warning' : 'primary'}`}
              >
                {example.badge}
              </span>
            </div>

            <div className="stack-sm">
              <h3>{example.title}</h3>
              <p className="text-small text-muted">{example.blurb}</p>
            </div>

            <div className="row-xs flex-wrap example-card__concepts">
              {example.concepts.map((concept) => (
                <span key={concept} className="tag">
                  {concept}
                </span>
              ))}
            </div>

            <div className="example-card__footer">
              <span className="example-card__cta">Open example</span>
              <span className="example-card__path">{example.path}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
