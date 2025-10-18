// Register all demos
// This file imports all demo registrations to populate the DemoRegistry

// 01-basics - NEW INTERACTIVE DEMOS
import './01-basics/hello-world';
import './01-basics/counter';
import './01-basics/reading-state';
import './01-basics/updating-state';
import './01-basics/multiple-components';
import './01-basics/instance-management';

// 02-core-concepts - NEW INTERACTIVE DEMOS
import './02-core-concepts/cubit-deep-dive';
import './02-core-concepts/bloc-deep-dive';
import './02-core-concepts/bloc-vs-cubit';
import './02-core-concepts/computed-properties';
import './02-core-concepts/lifecycle';

// 01-basics - OLD DEMOS (to be refactored or removed)
// Removed: instance-id and isolated-counter (duplicates of instance-management)
// TODO: Review basic-bloc - consider moving to 02-core-concepts or removing
import './01-basics/basic-bloc';

// 02-patterns
import './02-patterns/todo';
import './02-patterns/keep-alive';
import './02-patterns/props';
import './02-patterns/persistence';
import './02-patterns/simple-form'; // NEW Phase 7 demo
import './02-patterns/form-validation'; // NEW Phase 7 demo
import './02-patterns/async-loading'; // NEW Phase 7 demo
import './02-patterns/data-fetching'; // NEW Phase 7 demo
import './02-patterns/list-management'; // NEW Phase 7 demo
import './02-patterns/filtering-sorting'; // NEW Phase 7 demo
import './02-patterns/event-design';
// Removed redundant demos: simple-async, loading-states, form-cubit (superseded by NEW Phase 7 demos)

// 03-advanced
import './03-advanced/schema-validation';
import './03-advanced/async';
import './03-advanced/selectors';
import './03-advanced/custom-selectors';
import './03-advanced/stream';
import './03-advanced/bloc-composition';
import './03-advanced/dependencies';

// 04-plugins
import './04-plugins/custom-plugins';

// Add more demo imports here as they are created
// etc.

export {};
