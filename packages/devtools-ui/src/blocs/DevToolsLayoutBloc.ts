import { Cubit, blac } from '@blac/core';
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
  private instancesBloc = this.depend(DevToolsInstancesBloc);
  private diffBloc = this.depend(DevToolsDiffBloc);

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

  get selectedInstance(): InstanceData | null {
    if (!this.state.selectedId) return null;
    return this.instancesBloc().getInstance(this.state.selectedId);
  }

  get selectedDiff(): DiffResult {
    if (!this.state.selectedId) return null;
    return this.diffBloc().getDiff(this.state.selectedId);
  }

  get selectedHistory(): StateSnapshot[] {
    if (!this.state.selectedId) return [];
    return this.diffBloc().getHistory(this.state.selectedId);
  }
}
