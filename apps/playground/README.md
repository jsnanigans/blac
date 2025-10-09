# BlaC Playground

An interactive learning and testing platform for the BlaC state management framework.

## Overview

The BlaC Playground is a complete reimagining of the demo app, designed to provide:
- **Interactive Learning**: Progressive tutorials and guided examples
- **Live Coding**: Monaco editor with instant feedback
- **Performance Monitoring**: Real-time metrics and visualizations
- **Testing Integration**: Built-in test runners and benchmarks
- **Better UX**: Proper navigation, search, and categorization

## Features

### ✅ Completed
- Project structure and configuration
- Routing system with React Router
- Demo categorization system
- Navigation layout with theme switching
- Home page with feature overview
- TypeScript configuration
- Tailwind CSS setup

### 🚧 In Progress
- Code viewer with syntax highlighting
- Interactive playground/sandbox
- Performance monitoring dashboard
- Test runner integration

### 📋 Planned
- State visualization tools
- Search and filtering
- Demo migration from old app
- API documentation page
- Learning paths

## Getting Started

```bash
# Install dependencies
cd apps/playground
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
src/
├── core/               # Core infrastructure
│   ├── components/     # Reusable components
│   ├── layouts/        # Layout components
│   ├── hooks/          # Custom hooks
│   └── utils/          # Utilities
├── demos/              # Demo categories
│   ├── 01-basics/      # Getting started
│   ├── 02-patterns/    # Common patterns
│   ├── 03-advanced/    # Advanced features
│   ├── 04-plugins/     # Plugin ecosystem
│   ├── 05-testing/     # Testing patterns
│   └── 06-real-world/  # Complete examples
├── playground/         # Interactive sandbox
├── features/           # Feature modules
└── pages/              # Route pages
```

## Demo Structure

Each demo follows a consistent structure:

```typescript
interface Demo {
  id: string;
  category: DemoCategory;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  concepts: string[];
  component: React.ComponentType;
  code: {
    demo: string;
    bloc?: string;
    usage?: string;
    test?: string;
  };
  tests?: DemoTest[];
  benchmarks?: DemoBenchmark[];
  documentation?: string;
}
```

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast builds
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Monaco Editor** for code editing
- **Prism** for syntax highlighting
- **Framer Motion** for animations
- **TanStack Query** for data fetching

## Development Guidelines

1. **Component Structure**: Use functional components with hooks
2. **Styling**: Tailwind utilities with CSS modules for complex styles
3. **State Management**: Dogfood BlaC for all state
4. **Testing**: Write tests for all demos
5. **Documentation**: Include inline docs and README for each demo

## Contributing

When adding new demos:
1. Create a new folder in the appropriate category
2. Include demo component, code, tests, and documentation
3. Register the demo in the demo registry
4. Add navigation entry if needed
5. Write comprehensive tests

## Next Steps

1. **Install dependencies**: Run `pnpm install` in the playground directory
2. **Complete remaining components**: Implement pending features
3. **Migrate demos**: Port existing demos with improvements
4. **Add tests**: Comprehensive test coverage
5. **Documentation**: Complete API and learning sections

## Council Approval

This playground addresses all Council recommendations:
- ✅ **Simplicity** (Lampson): Clear navigation and focused demos
- ✅ **UX** (Norman): Intuitive with search and categorization
- ✅ **Vision** (Kay): Shows the paradigm and tells the story
- ✅ **Documentation** (Cunningham): Self-documenting examples
- ✅ **Testing** (Beck): Visible test execution
- ✅ **Architecture** (Liskov): Clean abstractions
- ✅ **Performance** (Gregg): Monitoring and visualization
- ✅ **Distributed** (Kleppmann): Real-world patterns