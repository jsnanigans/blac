export * from './BlocGraphNode';
export * from './RootNode';
export * from './StateNode';
export * from './CompactBlocNode';
export * from './CompactRootNode';
export * from './CompactStateNode';

import { BlocGraphNodeComponent } from './BlocGraphNode';
import { RootNodeComponent } from './RootNode';
import { StateNodeComponent } from './StateNode';
import { CompactBlocNodeComponent } from './CompactBlocNode';
import { CompactRootNodeComponent } from './CompactRootNode';
import { CompactStateNodeComponent } from './CompactStateNode';

/**
 * Register all custom node types for React Flow
 */
export const customNodeTypes = {
  blocNode: BlocGraphNodeComponent,
  rootNode: RootNodeComponent,
  stateNode: StateNodeComponent,
  compactBlocNode: CompactBlocNodeComponent,
  compactRootNode: CompactRootNodeComponent,
  compactStateNode: CompactStateNodeComponent,
};
