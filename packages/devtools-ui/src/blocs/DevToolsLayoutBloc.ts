import { Cubit, blac } from '@blac/core';
import type { InstanceData } from '../types';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';
import { DevToolsDiffBloc, type DiffResult, type StateSnapshot } from './DevToolsDiffBloc';

export type TabName = 'Instances' | 'Logs';

type LayoutState = {
  activeTab: TabName;
  selectedId: string | null;
  isCurrentStateExpanded: boolean;
  isHistoryExpanded: boolean;
};

/**
 * Manages UI layout state (selection, panel expansion)
 * Provides coordinated getters that pull from other blocs
 */
@blac({ excludeFromDevTools: true })
export class DevToolsLayoutBloc extends Cubit<LayoutState> {
  constructor() {
    super({
      activeTab: 'Instances', // Default: Instances tab
      selectedId: null,
      isCurrentStateExpanded: true, // Default: expanded
      isHistoryExpanded: false, // Default: collapsed
    });
  }

  /**
   * Set active tab
   */
  setActiveTab = (tab: TabName) => {
    console.log(`[LayoutBloc] Active tab changed to:`, tab);
    this.patch({ activeTab: tab });
  };

  /**
   * Set selected instance ID
   */
  setSelectedId = (instanceId: string | null) => {
    console.log(`[LayoutBloc] Selected instance changed to:`, instanceId);
    this.patch({ selectedId: instanceId });
  };

  /**
   * Toggle current state panel expansion
   */
  toggleCurrentStateExpanded = () => {
    console.log(`[LayoutBloc] Toggling current state expanded`);
    this.patch({ isCurrentStateExpanded: !this.state.isCurrentStateExpanded });
  };

  /**
   * Toggle history panel expansion
   */
  toggleHistoryExpanded = () => {
    console.log(`[LayoutBloc] Toggling history expanded`);
    this.patch({ isHistoryExpanded: !this.state.isHistoryExpanded });
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

  /**
   * Get state history for selected instance
   * Borrows data from DevToolsDiffBloc
   */
  get selectedHistory(): StateSnapshot[] {
    if (!this.state.selectedId) return [];

    const diffBloc = DevToolsDiffBloc.get();
    return diffBloc.getHistory(this.state.selectedId);
  }
}
