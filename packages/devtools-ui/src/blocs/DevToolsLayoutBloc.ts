import { Cubit } from '@blac/core';
import type { InstanceData } from '../types';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';
import { DevToolsDiffBloc, type DiffResult } from './DevToolsDiffBloc';

type LayoutState = {
  selectedId: string | null;
  isDiffExpanded: boolean;
};

/**
 * Manages UI layout state (selection, panel expansion)
 * Provides coordinated getters that pull from other blocs
 */
export class DevToolsLayoutBloc extends Cubit<LayoutState> {
  /**
   * Exclude from DevTools to prevent infinite loop
   */
  static __excludeFromDevTools = true;

  constructor() {
    super({
      selectedId: null,
      isDiffExpanded: false,
    });
  }

  /**
   * Set selected instance ID
   */
  setSelectedId = (instanceId: string | null) => {
    console.log(`[LayoutBloc] Selected instance changed to:`, instanceId);
    this.patch({ selectedId: instanceId });
  };

  /**
   * Toggle diff panel expansion
   */
  toggleDiffExpanded = () => {
    console.log(`[LayoutBloc] Toggling diff expanded`);
    this.patch({ isDiffExpanded: !this.state.isDiffExpanded });
  };

  /**
   * Get currently selected instance
   * Borrows data from DevToolsInstancesBloc
   */
  get selectedInstance(): InstanceData | null {
    if (!this.state.selectedId) return null;

    const instancesBloc = DevToolsInstancesBloc.get();
    return instancesBloc.getInstance(this.state.selectedId);
  }

  /**
   * Get diff for selected instance
   * Borrows data from DevToolsDiffBloc
   */
  get selectedDiff(): DiffResult {
    if (!this.state.selectedId) return null;

    const diffBloc = DevToolsDiffBloc.get();
    return diffBloc.getDiff(this.state.selectedId);
  }
}
