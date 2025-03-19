import { useBloc } from '@blac/react';
import { Cubit } from 'blac-next';

class CounterBloc extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.emit({ count: this.state.count + 1 });
  };
}

function InstanceManagement() {
  const [{ count }, { increment }] = useBloc(CounterBloc);
  return (
    <button
      className="bg-card dark:bg-gray-800 shadow-sm border border-border dark:border-gray-700 rounded-md px-4 py-2 w-16 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 inline-flex items-center justify-center font-medium text-lg text-foreground dark:text-gray-100"
      onClick={increment}
    >
      {count}
    </button>
  );
}

export default InstanceManagement; 