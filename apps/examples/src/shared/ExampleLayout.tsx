import { ReactNode } from 'react';

interface ExampleLayoutProps {
  title: string;
  description: string;
  features: string[];
  children: ReactNode;
}

/**
 * Shared layout wrapper for all examples.
 * Provides consistent header and feature highlights with minimal styling.
 */
export function ExampleLayout({
  title,
  description,
  features,
  children,
}: ExampleLayoutProps) {
  return (
    <div className="example-layout">
      <header className="example-hero">
        <div className="example-hero__eyebrow">
          <span className="badge primary">Example Study</span>
          <span className="example-hero__code">patterns / {title}</span>
        </div>

        <div className="example-hero__grid">
          <div className="stack-sm">
            <h1>{title}</h1>
            <p className="text-muted">{description}</p>
          </div>

          {features.length > 0 && (
            <aside className="example-hero__aside">
              <span className="example-hero__aside-label">Key features</span>
              <ul className="feature-list">
                {features.map((feature, i) => (
                  <li key={i} className="text-small text-muted">
                    {feature}
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </header>

      <main className="example-content">{children}</main>
    </div>
  );
}
