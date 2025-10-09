# Multi-File Support for Playground

## Current Status
✅ **Multi-file support has been implemented!** The playground now supports multiple files with tabs, allowing you to organize your code across different files.

## Implemented Features

### ✅ Tab-Based File Navigation
- Multiple files displayed as tabs above the editor
- Click to switch between files
- Visual indicator for active file
- Smooth transitions between files

### ✅ File Management
- **Add Files**: Click "New File" button to create new files
- **Rename Files**: Double-click on tab to rename files
- **Close Files**: Click X button on tabs (minimum 1 file required)
- **File Type Detection**: Automatic language detection based on file extension

### ✅ Multi-File Transpilation
- All files are bundled together using esbuild-wasm
- Proper module resolution between files
- CSS files are automatically injected as styles
- Support for TypeScript, JavaScript, CSS, and JSON files

### ✅ Persistence & Sharing
- Files are saved to localStorage
- Share button creates a URL with all files encoded
- Load shared projects from URL parameters
- Download individual files

### ✅ Default Example
The playground starts with a two-file example:
1. `App.tsx` - Main React component with BlaC integration
2. `styles.css` - Accompanying styles demonstrating CSS support

## Technical Implementation

### File Structure
```typescript
interface PlaygroundFile {
  id: string;           // Unique identifier
  name: string;         // File name (e.g., "App.tsx")
  content: string;      // File content
  language: 'typescript' | 'javascript' | 'css' | 'json';
}
```

### Key Components

1. **`PlaygroundPageMultiFile.tsx`**: Main playground component with multi-file state management
2. **`FileTabs.tsx`**: Tab UI component for file navigation
3. **`types.ts`**: Type definitions and default file templates
4. **`transpiler.ts`**: Enhanced with `transpileMultipleFiles()` function

### How It Works

1. **File Management**: Files are stored in React state as an array
2. **Bundling**: When running code, all files are bundled together using esbuild-wasm
3. **Module Resolution**: Files can import from each other using relative paths
4. **CSS Injection**: CSS files are automatically injected as `<style>` tags
5. **Component Detection**: The sandbox automatically finds and renders exported React components

## Usage Examples

### Creating a Multi-File Project

```typescript
// App.tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import './styles.css';
import { Button } from './Button';

export function App() {
  const [count, counter] = useBloc(CounterCubit);
  return (
    <div className="app">
      <h1>Count: {count}</h1>
      <Button onClick={counter.increment}>+</Button>
    </div>
  );
}
```

```typescript
// Button.tsx
export function Button({ onClick, children }) {
  return (
    <button className="custom-button" onClick={onClick}>
      {children}
    </button>
  );
}
```

```css
/* styles.css */
.app {
  padding: 2rem;
}

.custom-button {
  background: blue;
  color: white;
  padding: 0.5rem 1rem;
}
```

## Future Enhancements

- **File Tree View**: Add a sidebar with hierarchical file structure
- **Import Autocomplete**: Suggest imports from other files
- **File Templates**: Quick-start templates for common patterns
- **Zip Export/Import**: Export/import entire projects as zip files
- **GitHub Gist Integration**: Save and load from GitHub Gists
- **Live Collaboration**: Real-time collaborative editing