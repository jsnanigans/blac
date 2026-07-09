// Renderer primitives re-exported from lit-html (one import for consumers).
export { html, svg, nothing, noChange } from 'lit-html';

// Authoring + bootstrap.
export { component, type Ctx, type ComponentFactory } from './component';
export { mount, type MountHandle } from './mount';

// Reactive reads.
export { select, isBinding, bind, type Binding, type ReadFn } from './live';

// Control flow.
export { when, each, match } from './control-flow';

// Forms.
export { model } from './forms';

// Config.
export { configureBlacLit, type BlacLitConfig } from './config';
