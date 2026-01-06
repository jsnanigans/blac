import { Cubit, blac, borrow } from '@blac/core';
import type { InstanceData } from '../types';
import { DevToolsInstancesBloc } from './DevToolsInstancesBloc';
import {
  DevToolsDiffBloc,
  type DiffResult,
  type StateSnapshot,
} from './DevToolsDiffBloc';

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
    this.patch({ activeTab: tab });
  };

  /**
   * Set selected instance ID
   */
  setSelectedId = (instanceId: string | null) => {
    this.patch({ selectedId: instanceId });
  };

  /**
   * Toggle current state panel expansion
   */
  toggleCurrentStateExpanded = () => {
    this.patch({ isCurrentStateExpanded: !this.state.isCurrentStateExpanded });
  };

  /**
   * Toggle history panel expansion
   */
  toggleHistoryExpanded = () => {
    this.patch({ isHistoryExpanded: !this.state.isHistoryExpanded });
  };

  /**
   * Get currently selected instance
   * Borrows data from DevToolsInstancesBloc
   */
  get selectedInstance(): InstanceData | null {
    if (!this.state.selectedId) return null;

    const instancesBloc = borrow(DevToolsInstancesBloc);
    return instancesBloc.getInstance(this.state.selectedId);
  }

  /**
   * Get diff for selected instance
   * Borrows data from DevToolsDiffBloc
   */
  get selectedDiff(): DiffResult {
    if (!this.state.selectedId) return null;

    const diffBloc = borrow(DevToolsDiffBloc);
    return diffBloc.getDiff(this.state.selectedId);
  }

  /**
   * Get state history for selected instance
   * Borrows data from DevToolsDiffBloc
   */
  get selectedHistory(): StateSnapshot[] {
    if (!this.state.selectedId) return [];

    const diffBloc = borrow(DevToolsDiffBloc);
    return diffBloc.getHistory(this.state.selectedId);
  }
}
