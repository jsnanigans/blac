/**
 * React Flow Prototype Test Page
 *
 * This page allows manual testing of the React Flow graph visualization prototype
 * to validate performance before full implementation.
 *
 * Test Instructions:
 * 1. Load this page in browser
 * 2. Observe initial FPS with 20 nodes
 * 3. Click "Start Updates" to simulate rapid state changes
 * 4. Monitor FPS - should maintain 60fps on desktop, 30fps on mobile
 * 5. Increase node count to 50+ for stress testing
 * 6. Test zoom, pan, and minimap controls
 * 7. Test expand/collapse on nodes
 * 8. Check mobile responsiveness
 */

import React from 'react';
import { BlocGraphPrototype } from '../components/bloc-graph-prototype';

export default function PrototypeTest() {
  return (
    <div>
      <BlocGraphPrototype />
    </div>
  );
}
