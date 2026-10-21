import type { Paths } from '@blac/devtools-connect/protocol';

const SHOWN = 4;

export function PathChips({ paths }: { paths?: Paths }) {
  if (!paths) return null;
  if (paths === 'all') return <span className="chip">all</span>;
  return (
    <span className="chips">
      {paths.slice(0, SHOWN).map((path) => (
        <span key={path} className="chip">
          {path}
        </span>
      ))}
      {paths.length > SHOWN && (
        <span className="muted">+{paths.length - SHOWN}</span>
      )}
    </span>
  );
}
