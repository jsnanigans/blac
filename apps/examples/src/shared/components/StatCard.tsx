interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

/**
 * Simple stat card for displaying key metrics.
 */
export function StatCard({ label, value, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
