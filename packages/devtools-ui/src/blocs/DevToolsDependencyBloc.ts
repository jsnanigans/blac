import { Cubit, blac } from '@blac/core';
import type { DependencyEdge } from '../types';

type DependencyState = {
  edges: DependencyEdge[];
};

/**
 * Tracks dependency edges between BlaC instances.
 * Populated from the initial state dump and updated on instance-created events.
 */
@blac({ excludeFromDevTools: true })
export class DevToolsDependencyBloc extends Cubit<DependencyState> {
  constructor() {
    super({ edges: [] });
  }

  setEdges = (edges: DependencyEdge[]) => {
    this.patch({ edges });
  };

  addEdgesForInstance = (instanceId: string, edges: DependencyEdge[]) => {
    // Remove old edges from this instance, then add new ones
    const existing = this.state.edges.filter((e) => e.fromId !== instanceId);
    this.patch({ edges: [...existing, ...edges] });
  };

  removeEdgesForInstance = (instanceId: string) => {
    const edges = this.state.edges.filter((e) => e.fromId !== instanceId);
    this.patch({ edges });
  };

  /** Get all instances that a given instance depends on */
  getDependenciesOf = (instanceId: string): DependencyEdge[] => {
    return this.state.edges.filter((e) => e.fromId === instanceId);
  };

  /** Get all instances that depend on a given class */
  getDependentsOn = (className: string): DependencyEdge[] => {
    return this.state.edges.filter((e) => e.toClass === className);
  };
}
