# Playground "Edit in Playground" Fix Summary

## Problem
The "edit in playground" feature was broken because:
1. Demo source files included UI library imports (`@/ui/Card`, `@/ui/Button`) that don't exist in the sandbox
2. The playground was trying to load raw source files with these dependencies
3. The code generation was messy with a huge nested ternary for component detection

## Solution Implemented

### 1. Created Clean Code Exports (`demoCodeExports.ts`)
- Self-contained demo code without UI dependencies
- Simple HTML/CSS instead of custom components
- Properly formatted for the playground
- Each demo exports as `App` for consistent detection

### 2. Added Demo Code Processor (`demoCodeProcessor.ts`)
- Processes demo code to remove UI dependencies
- Replaces UI components with simple HTML equivalents
- Handles different code structures (structured vs raw source)
- Detects and exports component names properly

### 3. Fixed Raw Import Issues
- Removed all `?raw` imports that were causing TypeScript errors
- Updated all demo index files to not rely on raw imports
- Demos now use empty strings for code, relying on the clean exports

### 4. Improved Sandbox Component Detection
- Better component name detection
- Cleaner list of possible component names
- Removed the massive nested ternary

## How It Works Now

1. When user clicks "Open in Playground" with `?demo=counter`:
   - First tries to get clean code from `demoCodeExports`
   - Falls back to processing demo registry code if needed
   - Generates self-contained, runnable code

2. The generated code:
   - Has no UI library dependencies
   - Uses standard React and BlaC imports only
   - Includes proper component exports
   - Works in the sandbox environment

## UI Component Replacements

| Original Component | Replacement |
|-------------------|-------------|
| `<Card>` | `<div className="border rounded-lg p-4">` |
| `<CardContent>` | `<div className="p-4">` |
| `<Button>` | `<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">` |
| `<Badge>` | `<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">` |

## Multi-File Support (Future)

Currently, the playground only supports single-file editing. See `MULTI_FILE_SUPPORT.md` for plans to add:
- Tab-based file switching
- Virtual file system
- Better code organization

## Testing

To test the fix:
1. Run the playground: `pnpm --filter playground dev`
2. Navigate to a demo page
3. Click "Open in Playground"
4. The code should load and be runnable without errors

## Files Modified

- `/apps/playground/src/pages/PlaygroundPage.tsx` - Updated to use clean code
- `/apps/playground/src/lib/demoCodeProcessor.ts` - New processor for cleaning demo code
- `/apps/playground/src/demos/demoCodeExports.ts` - Clean demo code exports
- `/apps/playground/src/lib/sandbox.ts` - Improved component detection
- All demo `index.ts` files - Removed `?raw` imports

## Known Limitations

1. **Single File Only**: All code must be in one file
2. **Limited Demos**: Only some demos have clean exports (counter, emit-patch, isolated-counter, todo)
3. **No CSS Files**: Can't have separate CSS files
4. **No Asset Imports**: Can't import images or other assets

## Next Steps

1. Add clean exports for all remaining demos
2. Implement multi-file support with tabs
3. Add CSS file support
4. Improve error messages when components aren't found
5. Add ability to save/share playground sessions