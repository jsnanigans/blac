interface FieldSummaryProps {
  label: string;
  value: string | boolean | null | undefined;
}

export function FieldSummary({ label, value }: FieldSummaryProps) {
  const displayValue = () => {
    if (value === null || value === undefined || value === '') {
      return '(not set)';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  return (
    <div className="field-summary">
      <dt className="text-small text-muted">{label}</dt>
      <dd>{displayValue()}</dd>
    </div>
  );
}
