# Quick Start: React Compiler Testing

## 🚀 Usage

```bash
# Test WITHOUT compiler (default - existing behavior)
pnpm test
pnpm test:watch

# Test WITH React 19 compiler
pnpm test:compiler
pnpm test:watch:compiler

# Run BOTH for comparison
pnpm test:both
```

## 📁 Configuration Files

- **`vitest.config.ts`** - Default config WITHOUT compiler
- **`vitest.config.compiler.ts`** - Config WITH React 19 compiler enabled

## 🔍 What's Different?

The React Compiler automatically memoizes components and hooks. Key areas to watch:

1. **Dependency Tracking** - Does proxy-based tracking still work?
2. **Re-render Counts** - Are renders optimized correctly?
3. **Memory Management** - Does WeakRef cleanup still function?
4. **Method Binding** - Do arrow functions maintain `this` context?

## 📖 Full Documentation

See [`TESTING-REACT-COMPILER.md`](./TESTING-REACT-COMPILER.md) for:
- Detailed testing strategy
- Known considerations for BlaC's architecture
- Debugging tips
- What to look for when comparing results

## ⚡ Quick Comparison Test

```bash
cd packages/blac-react

# Run both and compare
pnpm test:both

# Or run specific tests with both configs
pnpm test -- path/to/test.tsx
pnpm test:compiler -- path/to/test.tsx
```

## 🎯 Key Test Areas

- `src/__tests__/dependency-tracking/` - Proxy tracking
- `src/__tests__/useBloc.*.test.tsx` - Hook behavior
- `src/__tests__/render-optimization.test.tsx` - Re-render logic

---

The compiler is **opt-in** - your default tests remain unchanged.
