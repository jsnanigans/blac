# Multi-File Support for Playground

## Current Status
The playground currently supports only single-file editing. All code must be in one file.

## Issues with Current Implementation
1. **UI Dependencies**: Demo source files include UI library imports (`@/ui/Card`, etc.) that don't exist in the sandbox
2. **Code Generation**: The playground tries to auto-generate wrapper code which creates messy output
3. **Raw Import Issues**: Using `?raw` imports for demo source causes TypeScript errors

## Current Solution
Created a `demoCodeExports.ts` file with clean, self-contained demo code that:
- Has no UI library dependencies
- Uses simple HTML/CSS instead of custom components
- Is properly formatted for the playground
- Exports components with the correct names

## Future Multi-File Support

### Option 1: Monaco Editor Tabs
- Add tab UI above the editor
- Store multiple files in state
- Switch between files with tabs
- Transpile and bundle all files together

### Option 2: File Tree Sidebar
- Add a file explorer sidebar
- Allow creating/deleting files
- More IDE-like experience
- Would require significant UI changes

### Option 3: Virtual File System
- Implement a virtual file system in the sandbox
- Allow imports between virtual files
- Use a bundler like esbuild in the browser
- Most complex but most powerful

### Recommended Approach
Start with Option 1 (tabs) as it's the simplest and provides immediate value:

```typescript
interface PlaygroundFile {
  name: string;
  content: string;
  language: 'typescript' | 'javascript' | 'css';
}

interface PlaygroundState {
  files: PlaygroundFile[];
  activeFile: string;
}
```

Then the UI would show tabs for each file and bundle them together before execution.

## Implementation Steps for Multi-File Support

1. **Update State Structure**
   - Change from single `code` string to array of files
   - Track active file

2. **Update UI**
   - Add tab bar above editor
   - Add "New File" button
   - Add file rename/delete options

3. **Update Transpilation**
   - Bundle multiple files together
   - Handle imports between files
   - Use esbuild-wasm or similar

4. **Update Sandbox**
   - Support module resolution
   - Handle CSS files
   - Support asset imports

## Benefits of Multi-File Support
- Better organization for complex demos
- Ability to separate concerns (components, styles, logic)
- More realistic development experience
- Support for CSS modules or separate stylesheets
- Easier to share and understand larger examples