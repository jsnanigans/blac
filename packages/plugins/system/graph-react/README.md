# @blac/plugin-graph-react

React visualization components for [@blac/plugin-graph](../graph).

## Installation

```bash
npm install @blac/plugin-graph-react @blac/plugin-graph @blac/react @blac/core
# or
pnpm add @blac/plugin-graph-react @blac/plugin-graph @blac/react @blac/core
```

## Usage

```tsx
import { BlocGraphVisualizer } from '@blac/plugin-graph-react';
import { GraphPlugin } from '@blac/plugin-graph';
import { Blac } from '@blac/core';

// Register the graph plugin
Blac.instance.plugins.add(new GraphPlugin());

// Use the visualizer
function App() {
  return (
    <BlocGraphVisualizer />
  );
}
```

## Features

- **Hierarchical Tree Visualization**: Displays Blac → Blocs → State → Properties recursively
- **Interactive**: Zoom, pan, and hover for details
- **Type-Colored Nodes**: Different colors for different data types
- **Real-time Updates**: Automatically updates when state changes
- **Tooltips**: Hover any node to see full value and path

## API

### `BlocGraphVisualizer`

Main visualization component.

**Props:**

- `width?: number` - Width of the visualization (default: 1200)
- `height?: number` - Height of the visualization (default: 800)
- `className?: string` - Custom CSS class name

## Dependencies

- React 18+ or 19+
- @visx/hierarchy, @visx/group, @visx/shape, @visx/zoom
- @radix-ui/react-tooltip
- @blac/core, @blac/react, @blac/plugin-graph

## License

MIT
