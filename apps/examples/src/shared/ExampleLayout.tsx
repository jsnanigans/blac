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
      <header className="example-header">
        <div className="stack-sm">
          <span className="text-xs text-muted">EXAMPLE</span>
          <h1>{title}</h1>
        </div>
        <p className="text-muted">{description}</p>
        {features.length > 0 && (
          <div className="stack-sm">
            <h4 className="text-small">Key Features</h4>
            <ul className="stack-xs">
              {features.map((feature, i) => (
                <li key={i} className="text-small text-muted">
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>
      <main className="example-content">{children}</main>
    </div>
  );
}
