import React from 'react';
import { ratio, type Table } from './tables';

const colorFor = (r: number): string =>
  r <= 1.05
    ? 'var(--color-fastest)'
    : r <= 1.5
      ? 'var(--color-ok)'
      : 'var(--color-slow)';

export function ComparisonTable({ table }: { table: Table }) {
  return (
    <div className="results-section">
      <h3>{table.title}</h3>
      {table.note && <p className="stat-detail">{table.note}</p>}
      <table className="results-table">
        <thead>
          <tr>
            <th />
            {table.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {row.cells.map((cell, i) => {
                if (!cell) return <td key={i}>—</td>;
                const r = table.compare ? ratio(cell, row.cells) : 1;
                return (
                  <td
                    key={i}
                    style={table.compare ? { color: colorFor(r) } : undefined}
                  >
                    <strong>{cell.text}</strong>
                    {table.compare && r > 1.05 && ` ${r.toFixed(2)}×`}
                    {cell.detail && (
                      <span className="stat-detail"> {cell.detail}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
