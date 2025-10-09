# Learning Paths

Master BlaC state management with our structured learning paths designed for different skill levels and use cases.

## 🚀 Quick Start Path

**For developers who want to get up and running quickly**

### 1. Installation & Setup (5 min)

Start with [Installation](/getting-started/installation) to set up BlaC in your project.

### 2. Your First Cubit (10 min)

Learn the basics with [Your First Cubit](/getting-started/first-cubit) - create a simple counter.

### 3. React Integration (8 min)

Connect your state to React components using the [useBloc hook](/api/react/use-bloc).

### 4. Try Interactive Examples (15 min)

Explore live demos in the [BlaC Playground](https://blac-playground.vercel.app/demos) to see patterns in action.

## 📚 Fundamentals Path

**For developers who want to understand core concepts**

### Week 1: Core Concepts

- [What is BlaC?](/introduction) - Philosophy and architecture
- [State Management](/concepts/state-management) - How BlaC manages state
- [Cubits](/concepts/cubits) - Simple state containers
- [Your First Cubit](/getting-started/first-cubit) - Hands-on practice

### Week 2: Event-Driven Architecture

- [Blocs](/concepts/blocs) - Event-driven state management
- [Your First Bloc](/getting-started/first-bloc) - Build an event-driven component
- [Async Operations](/getting-started/async-operations) - Handle async workflows

### Week 3: React Integration

- [React Hooks](/react/hooks) - useBloc and useExternalBlocStore
- [React Patterns](/react/patterns) - Best practices for React apps
- [Instance Management](/concepts/instance-management) - Shared vs isolated instances

## 🔥 Advanced Path

**For developers building complex applications**

### Performance Optimization

1. **Selectors & Memoization**
   - Understanding proxy-based dependency tracking
   - Writing efficient selectors
   - Preventing unnecessary re-renders

2. **Instance Management Strategies**
   - When to use shared vs isolated instances
   - Keep-alive patterns for persistent state
   - Props-based Blocs for dynamic instances

3. **Testing & Debugging**
   - Unit testing Cubits and Blocs
   - Integration testing with React
   - Using the RenderLoggingPlugin

### Plugin Development

1. **Plugin System Overview**
   - [Understanding the plugin architecture](/plugins/overview)
   - [System vs Bloc plugins](/plugins/system-plugins)

2. **Built-in Plugins**
   - [Persistence Plugin](/plugins/persistence) - Auto-save state
   - Creating custom logging plugins

3. **Custom Plugin Development**
   - [Creating your own plugins](/plugins/creating-plugins)
   - Lifecycle hooks and events
   - Best practices

### Architecture Patterns

1. **Composition Patterns**
   - Composing multiple Blocs
   - Parent-child state relationships
   - Cross-cutting concerns

2. **Error Handling**
   - Global error boundaries
   - Bloc-level error handling
   - Recovery strategies

3. **Real-World Patterns**
   - Authentication flows
   - Form management
   - Data fetching and caching

## 🎯 Migration Path

**For teams migrating from other state management solutions**

### From Redux

1. Compare concepts: [BlaC vs Redux](/comparisons#redux)
2. Map Redux patterns to BlaC patterns
3. Gradual migration strategy
4. [See migration example](https://blac-playground.vercel.app/demos/migration/from-redux)

### From MobX

1. Compare reactivity models: [BlaC vs MobX](/comparisons#mobx)
2. Convert observables to Cubits
3. Handle computed values
4. [See migration example](https://blac-playground.vercel.app/demos/migration/from-mobx)

### From Context API

1. Compare simplicity: [BlaC vs Context](/comparisons#context-api)
2. Replace providers with Blocs
3. Improve performance
4. [See migration example](https://blac-playground.vercel.app/demos/migration/from-context)

## 📖 Reference Path

**For quick lookups and API reference**

### Core APIs

- [Blac](/api/core/blac) - Global configuration
- [Cubit](/api/core/cubit) - Simple state container
- [Bloc](/api/core/bloc) - Event-driven container
- [BlocBase](/api/core/bloc-base) - Base class

### React APIs

- [useBloc](/api/react/use-bloc) - Primary React hook
- [useExternalBlocStore](/api/react/use-external-bloc-store) - External instances

### Plugin APIs

- [Plugin API Reference](/plugins/api-reference)
- [Creating Plugins](/plugins/creating-plugins)

## 🚢 Production Path

**For teams preparing for production**

### Pre-Production Checklist

- [ ] Error handling strategy implemented
- [ ] Performance monitoring in place
- [ ] State persistence configured
- [ ] Testing coverage > 80%
- [ ] Documentation updated

### Best Practices

- [Testing strategies](/patterns/testing)
- [Performance optimization](/patterns/performance)
- [Error handling](/patterns/error-handling)
- [State persistence](/patterns/persistence)

### Monitoring & Debugging

- Using the RenderLoggingPlugin
- Performance profiling
- State debugging techniques
- Production error tracking

## 🎓 Interactive Learning

### Try the Playground

The [BlaC Playground](https://blac-playground.vercel.app) offers:

- **Live Demos**: See code and results side-by-side
- **Interactive Editor**: Modify examples in real-time
- **Performance Metrics**: Understand render optimization

### Community Resources

- [GitHub Discussions](https://github.com/jsnanigans/blac/discussions) - Ask questions
- [Discord Community](#) - Chat with other developers
- [Stack Overflow](https://stackoverflow.com/questions/tagged/blac) - Find answers

## Next Steps

Ready to start? Here are your options:

<div class="tip custom-block" style="padding-top: 8px">

**New to BlaC?** Start with the [Quick Start Path](#quick-start-path)

**Know the basics?** Jump to the [Advanced Path](#advanced-path)

**Migrating a project?** Check the [Migration Path](#migration-path)

**Need specific info?** Use the [Reference Path](#reference-path)

</div>

---

Remember: The best way to learn is by doing. Open the [Playground](https://blac-playground.vercel.app) in another tab and practice as you learn!
