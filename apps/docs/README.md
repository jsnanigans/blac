# BlaC Documentation

This directory contains the VitePress documentation site for BlaC.

## Development

Start the documentation development server:

```bash
# From root
pnpm docs:dev

# From this directory
pnpm dev
```

The docs will be available at `http://localhost:5173`

## Building

Build the documentation for production:

```bash
# From root
pnpm docs:build

# From this directory
pnpm build
```

## Preview

Preview the built documentation:

```bash
# From root
pnpm docs:preview

# From this directory
pnpm preview
```

## Documentation Structure

```
apps/docs/
├── .vitepress/
│   └── config.ts         # VitePress configuration
├── guide/                # Introduction and guides
│   ├── introduction.md
│   ├── why-blac.md
│   ├── core-concepts.md
│   └── installation.md
├── core/                 # @blac/core documentation
│   ├── getting-started.md
│   ├── configuration.md
│   ├── cubit.md
│   ├── bloc.md
│   └── ...
├── react/                # @blac/react documentation
│   ├── getting-started.md
│   ├── installation.md
│   ├── use-bloc.md
│   └── ...
├── api/                  # API reference
│   ├── core/
│   └── react/
├── public/               # Static assets
└── index.md              # Home page
```

## Writing Documentation

### Adding New Pages

1. Create a new `.md` file in the appropriate directory
2. Add the page to the sidebar in `.vitepress/config.ts`
3. Use proper heading hierarchy (h1 for title, h2 for sections)

### Code Examples

Use code blocks with syntax highlighting:

\`\`\`typescript
class MyCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
}
\`\`\`

### Code Groups

Show multiple examples side by side:

\`\`\`typescript [Cubit]
class CounterCubit extends Cubit<number> {
  // ...
}
\`\`\`

\`\`\`typescript [Bloc]
class CounterBloc extends Bloc<number, CounterEvent> {
  // ...
}
\`\`\`

### Alerts

Use custom containers for important information:

\`\`\`::: tip
This is a helpful tip
:::

::: warning
This is a warning
:::

::: danger
This is dangerous information
:::\`\`\`

## Contributing

Contributions to the documentation are welcome! Please:

1. Follow the existing structure and style
2. Use clear, concise language
3. Provide runnable code examples
4. Test your changes locally before submitting

## VitePress Resources

- [VitePress Documentation](https://vitepress.dev/)
- [Markdown Extensions](https://vitepress.dev/guide/markdown)
- [Default Theme Config](https://vitepress.dev/reference/default-theme-config)
