interface ExampleLayoutProps {
  title: string;
  description: string;
  features: string[];
  children: React.ReactNode;
}

/**
 * Shared layout wrapper for all examples.
 * Provides consistent header and feature highlights.
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
          <span className="text-small">Interactive Module</span>
          <h1>{title}</h1>
        </div>
        <p className="example-description">{description}</p>
        <div className="example-features">
          <strong>Showcases</strong>
          <ul className="example-feature-list">
            {features.map((feature, i) => (
              <li key={i}>{feature}</li>
            ))}
          </ul>
        </div>
      </header>
      <main className="example-content">{children}</main>
    </div>
  );
}
