# AGENTS.md

Essential guidance for coding agents working on the Blac state management library.

## Commands

```bash
# Build/Test/Lint
pnpm build              # Build all packages
pnpm test               # Run all tests
pnpm lint               # Lint with TypeScript strict rules
turbo test --filter=@blac/core    # Test single package
vitest run --config packages/blac/vitest.config.ts  # Run specific test file

# Development
pnpm dev                # Run all apps in dev mode
pnpm typecheck          # TypeScript type checking
```

## Code Style

- **Imports**: Absolute imports from `@blac/core`, relative for local files
- **Types**: Strict TypeScript with generics (`Cubit<State>`, `Bloc<State, Event>`)
- **Formatting**: Prettier with single quotes, no semicolons where optional
- **Naming**: PascalCase for classes, camelCase for methods/variables
- **Comments**: JSDoc for public APIs, inline for complex logic only
- **Error handling**: Use `Blac.warn()` for warnings, throw for critical errors
- **Testing**: Vitest with descriptive `describe/it` blocks, React Testing Library for components