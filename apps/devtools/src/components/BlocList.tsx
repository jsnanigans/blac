interface BlocInfo {
  id: string;
  name: string;
  state: any;
  timestamp: number;
}

interface BlocListProps {
  blocs: BlocInfo[];
}

function BlocList({ blocs }: BlocListProps) {
  return (
    <div className="bloc-list">
      <h2>Active Blocs ({blocs.length})</h2>
      <div className="bloc-items">
        {blocs.length === 0 ? (
          <p className="empty-message">No active blocs</p>
        ) : (
          blocs.map((bloc) => (
            <div key={bloc.id} className="bloc-item">
              <div className="bloc-name">{bloc.name}</div>
              <div className="bloc-id">{bloc.id.slice(0, 8)}...</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BlocList;
