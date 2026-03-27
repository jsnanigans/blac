/**
 * Simplified DevTools Layout Test - tests instance management and sorting
 */
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vite-plus/test';
import { useBloc } from '../useBloc';
import { Cubit, blac, clearAll, acquire } from '@blac/core';
import React from 'react';

// Simplified types
type InstanceData = {
  id: string;
  className: string;
  state: any;
  isDisposed: boolean;
};

type LayoutState = {
  selectedId: string | null;
  instances: InstanceData[];
};

// Simplified LayoutBloc
class LayoutBloc extends Cubit<LayoutState> {
  constructor() {
    super({
      selectedId: null,
      instances: [],
    });
  }

  addInstance = (instance: InstanceData) => {
    const existing = this.state.instances.find((i) => i.id === instance.id);
    if (existing) {
      this.updateInstance(instance.id, instance);
      return;
    }
    const instances = [...this.state.instances, instance];
    this.patch({ instances });
  };

  removeInstance = (instanceId: string) => {
    const instances = this.state.instances.filter((i) => i.id !== instanceId);
    const selectedId =
      this.state.selectedId === instanceId ? null : this.state.selectedId;
    this.patch({ instances, selectedId });
  };

  updateInstance = (instanceId: string, updates: Partial<InstanceData>) => {
    const instances = this.state.instances.map((inst) => {
      if (inst.id === instanceId) {
        return { ...inst, ...updates };
      }
      return inst;
    });
    this.patch({ instances });
  };

  setAllInstances = (instances: InstanceData[]) => {
    this.patch({ instances: instances.slice() });
  };

  setSelectedId = (instanceId: string | null) => {
    this.patch({ selectedId: instanceId });
  };

  get selected() {
    return (
      this.state.instances.find((inst) => inst.id === this.state.selectedId) ||
      null
    );
  }

  get sortedInstances() {
    return [...this.state.instances].sort((a, b) =>
      a.className.localeCompare(b.className),
    );
  }
}
blac({ excludeFromDevTools: true })(LayoutBloc);

// Simplified test component
const SimpleDevToolsPanel: React.FC = () => {
  const [{ instances }, bloc] = useBloc(LayoutBloc);

  return (
    <div data-testid="devtools-panel">
      <div data-testid="instance-count">{instances.length}</div>
      <div data-testid="instance-list">
        {bloc.sortedInstances.map((instance: InstanceData) => (
          <div
            key={instance.id}
            data-testid={`instance-${instance.id}`}
            data-classname={instance.className}
            onClick={() => bloc.setSelectedId(instance.id)}
          >
            {instance.className}#{instance.id}
          </div>
        ))}
      </div>
      {bloc.selected && (
        <div data-testid="selected-instance">
          {bloc.selected.className}#{bloc.selected.id}
        </div>
      )}
    </div>
  );
};

describe('DevTools Layout - Instance Management', () => {
  afterEach(() => {
    cleanup();
    clearAll();
  });

  it('should start with empty instances', () => {
    render(<SimpleDevToolsPanel />);
    expect(screen.getByTestId('instance-count')).toHaveTextContent('0');
  });

  it('should add instances and maintain order', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'counter-1',
        className: 'CounterCubit',
        state: { count: 0 },
        isDisposed: false,
      });

      bloc.addInstance({
        id: 'auth-1',
        className: 'AuthBloc',
        state: { user: null },
        isDisposed: false,
      });

      bloc.addInstance({
        id: 'counter-2',
        className: 'CounterCubit',
        state: { count: 5 },
        isDisposed: false,
      });
    });

    // Query only the instance items within the instance-list
    const instanceList = screen.getByTestId('instance-list');
    const instances = instanceList.querySelectorAll(
      '[data-testid^="instance-"]',
    );
    expect(instances).toHaveLength(3);

    expect(instances[0]).toHaveAttribute('data-classname', 'AuthBloc');
    expect(instances[1]).toHaveAttribute('data-classname', 'CounterCubit');
    expect(instances[2]).toHaveAttribute('data-classname', 'CounterCubit');
  });

  it('should sort instances by className', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'z-1',
        className: 'ZebraCubit',
        state: {},
        isDisposed: false,
      });

      bloc.addInstance({
        id: 'a-1',
        className: 'AppleCubit',
        state: {},
        isDisposed: false,
      });

      bloc.addInstance({
        id: 'm-1',
        className: 'MangoCubit',
        state: {},
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('3');
    });

    // Query only the instance items within the instance-list
    const instanceList = screen.getByTestId('instance-list');
    const instances = instanceList.querySelectorAll(
      '[data-testid^="instance-"]',
    );
    expect(instances[0]).toHaveAttribute('data-classname', 'AppleCubit');
    expect(instances[1]).toHaveAttribute('data-classname', 'MangoCubit');
    expect(instances[2]).toHaveAttribute('data-classname', 'ZebraCubit');
  });

  it('should remove instances correctly', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'keep-1',
        className: 'KeepCubit',
        state: {},
        isDisposed: false,
      });

      bloc.addInstance({
        id: 'remove-1',
        className: 'RemoveCubit',
        state: {},
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('2');
    });

    act(() => {
      bloc.removeInstance('remove-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('1');
    });

    expect(screen.queryByTestId('instance-remove-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('instance-keep-1')).toBeInTheDocument();
  });

  it('should handle instance selection', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'select-1',
        className: 'SelectCubit',
        state: { value: 'test' },
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-select-1')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('selected-instance')).not.toBeInTheDocument();

    act(() => {
      bloc.setSelectedId('select-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-instance')).toHaveTextContent(
        'SelectCubit#select-1',
      );
    });
  });

  it('should clear selection when removing selected instance', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'temp-1',
        className: 'TempCubit',
        state: {},
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-temp-1')).toBeInTheDocument();
    });

    act(() => {
      bloc.setSelectedId('temp-1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-instance')).toBeInTheDocument();
    });

    act(() => {
      bloc.removeInstance('temp-1');
    });

    await waitFor(() => {
      expect(screen.queryByTestId('selected-instance')).not.toBeInTheDocument();
    });
  });

  it('should update instance data', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'update-1',
        className: 'UpdateCubit',
        state: { count: 0 },
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-update-1')).toBeInTheDocument();
    });

    act(() => {
      bloc.updateInstance('update-1', {
        state: { count: 10 },
      });
    });

    await waitFor(() => {
      const instance = bloc.state.instances.find((i) => i.id === 'update-1');
      expect(instance?.state.count).toBe(10);
    });
  });

  it('should handle setAllInstances for bulk updates', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    const instances: InstanceData[] = [
      { id: 'bulk-1', className: 'BulkCubit', state: {}, isDisposed: false },
      { id: 'bulk-2', className: 'BulkCubit', state: {}, isDisposed: false },
      { id: 'bulk-3', className: 'BulkCubit', state: {}, isDisposed: false },
    ];

    act(() => {
      bloc.setAllInstances(instances);
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('3');
    });

    expect(screen.getByTestId('instance-bulk-1')).toBeInTheDocument();
    expect(screen.getByTestId('instance-bulk-2')).toBeInTheDocument();
    expect(screen.getByTestId('instance-bulk-3')).toBeInTheDocument();
  });

  it('should prevent duplicate instances', async () => {
    render(<SimpleDevToolsPanel />);
    const bloc = acquire(LayoutBloc);

    act(() => {
      bloc.addInstance({
        id: 'dup-1',
        className: 'DupCubit',
        state: { value: 'original' },
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('1');
    });

    act(() => {
      bloc.addInstance({
        id: 'dup-1',
        className: 'DupCubit',
        state: { value: 'updated' },
        isDisposed: false,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('instance-count')).toHaveTextContent('1');
      const instance = bloc.state.instances.find((i) => i.id === 'dup-1');
      expect(instance?.state.value).toBe('updated');
    });
  });
});
