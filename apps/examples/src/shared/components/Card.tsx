import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Simple card component for grouping related content.
 */
export function Card({ title, subtitle, children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="text-muted text-small">{subtitle}</p>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
}
