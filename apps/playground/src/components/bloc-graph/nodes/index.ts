export * from './BlocGraphNode';
export * from './RootNode';
export * from './StateNode';

import { BlocGraphNodeComponent } from './BlocGraphNode';
import { RootNodeComponent } from './RootNode';
import { StateNodeComponent } from './StateNode';

/**
 * Register all custom node types for React Flow
 */
export const customNodeTypes = {
  blocNode: BlocGraphNodeComponent,
  rootNode: RootNodeComponent,
  stateNode: StateNodeComponent,
};
