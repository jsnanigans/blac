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
  isDiffExpanded: boolean;
  leftPanelWidth: number;
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
      activeTab: 'Instances',
      selectedId: null,
      isCurrentStateExpanded: true,
      isHistoryExpanded: false,
      isDiffExpanded: false,
      leftPanelWidth: 300,
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
   * Toggle diff panel expansion
   */
  toggleDiffExpanded = () => {
    this.patch({ isDiffExpanded: !this.state.isDiffExpanded });
  };

  /**
   * Set left panel width (clamped between 150 and 600)
   */
  setLeftPanelWidth = (width: number) => {
    this.patch({ leftPanelWidth: Math.max(150, Math.min(600, width)) });
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
