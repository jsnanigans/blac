/**
 * Processes demo code to make it playground-compatible
 * Removes UI library dependencies and creates self-contained examples
 */

interface ProcessedDemo {
  code: string;
  componentName?: string;
}

/**
 * Process demo code for the playground
 */
export function processDemoForPlayground(demo: any): ProcessedDemo {
  const parts: string[] = [];
  let detectedComponentName: string | undefined;

  // Header
  parts.push(`// BlaC Playground - ${demo.title || 'Demo'}
// ${demo.description || 'Interactive demo'}
// This code is auto-generated from the demo. Feel free to edit!
`);

  // Standard imports
  parts.push(`import React from 'react';
import { Cubit, Bloc, BlocBase } from '@blac/core';
import { useBloc, useExternalBlocStore } from '@blac/react';
`);

  // Process based on code structure
  if (demo.code) {
    if (typeof demo.code === 'object') {
      // Structured code with bloc/usage/demo sections

      // Add bloc/cubit code first
      if (demo.code.bloc) {
        parts.push('// === State Management ===');
        parts.push(processCodeSection(demo.code.bloc));
        parts.push('');
      }

      // Add component code
      const componentCode = demo.code.usage || demo.code.demo || '';
      if (componentCode) {
        parts.push('// === React Component ===');
        const processed = processCodeSection(componentCode);
        parts.push(processed);

        // Try to detect component name
        const nameMatch = processed.match(
          /(?:export\s+)?function\s+(\w+)\s*\(/,
        );
        if (nameMatch) {
          detectedComponentName = nameMatch[1];
        }
        parts.push('');
      }
    } else if (typeof demo.code === 'string') {
      // Single code string
      const processed = processRawDemoSource(demo.code);
      parts.push(processed.code);
      detectedComponentName = processed.componentName;
    } else if (demo.code.demo && typeof demo.code.demo === 'string') {
      // Raw source file in demo property
      const processed = processRawDemoSource(demo.code.demo);
      parts.push(processed.code);
      detectedComponentName = processed.componentName;
    }
  }

  // Add export helper if we detected a component
  if (detectedComponentName) {
    parts.push(`
// === Export for Playground ===
// Making the component available for the playground to render
export { ${detectedComponentName} as App };
`);
  }

  return {
    code: parts.join('\n'),
    componentName: detectedComponentName,
  };
}

/**
 * Process a code section, removing UI dependencies
 */
function processCodeSection(code: string): string {
  // Remove UI library imports
  let processed = code
    .replace(/import\s+{[^}]+}\s+from\s+['"]@\/ui\/[^'"]+['"];?\s*/g, '')
    .replace(
      /import\s+{[^}]+}\s+from\s+['"]@\/components\/[^'"]+['"];?\s*/g,
      '',
    )
    .replace(/import\s+{[^}]+}\s+from\s+['"]@\/lib\/[^'"]+['"];?\s*/g, '');

  // Replace UI components with simple HTML
  processed = replaceUIComponents(processed);

  return processed.trim();
}

/**
 * Process raw demo source file
 */
function processRawDemoSource(rawSource: string): ProcessedDemo {
  const lines = rawSource.split('\n');
  const cleanLines: string[] = [];
  let componentName: string | undefined;
  let skipNextLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines if needed
    if (skipNextLines > 0) {
      skipNextLines--;
      continue;
    }

    // Skip UI and local imports
    if (
      line.includes('import') &&
      (line.includes("from '@/") ||
        line.includes('from "@/') ||
        line.includes("from './") ||
        line.includes('from "./'))
    ) {
      // Skip multi-line imports
      if (!line.includes(';') && !line.trim().endsWith('}')) {
        let j = i + 1;
        while (
          j < lines.length &&
          !lines[j].includes(';') &&
          !lines[j].includes('}')
        ) {
          skipNextLines++;
          j++;
        }
        if (j < lines.length) skipNextLines++;
      }
      continue;
    }

    // Keep React and BlaC imports
    if (
      line.includes('import') &&
      (line.includes('@blac/') ||
        line.includes('react') ||
        line.includes('React'))
    ) {
      cleanLines.push(line);
      continue;
    }

    // Skip other imports
    if (line.trim().startsWith('import ')) {
      continue;
    }

    // Detect component name
    if (!componentName) {
      const match = line.match(/export\s+function\s+(\w+)\s*\(/);
      if (match) {
        componentName = match[1];
      }
    }

    // Skip export of code objects (like counterDemoCode)
    if (line.includes('export const') && line.includes('DemoCode')) {
      // Skip until the end of the object
      let j = i;
      let braceCount = 0;
      let started = false;
      while (j < lines.length) {
        const checkLine = lines[j];
        for (const char of checkLine) {
          if (char === '{') {
            braceCount++;
            started = true;
          } else if (char === '}') {
            braceCount--;
          }
        }
        if (started && braceCount === 0) {
          skipNextLines = j - i;
          break;
        }
        j++;
      }
      continue;
    }

    cleanLines.push(line);
  }

  let result = cleanLines.join('\n');

  // Replace UI components
  result = replaceUIComponents(result);

  return {
    code: result.trim(),
    componentName,
  };
}

/**
 * Replace UI library components with simple HTML equivalents
 */
function replaceUIComponents(code: string): string {
  return (
    code
      // Card components
      .replace(/<Card([^>]*)>/g, '<div className="border rounded-lg p-4">')
      .replace(/<\/Card>/g, '</div>')
      .replace(/<CardContent([^>]*)>/g, '<div className="p-4">')
      .replace(/<\/CardContent>/g, '</div>')
      .replace(/<CardHeader([^>]*)>/g, '<div className="p-4 border-b">')
      .replace(/<\/CardHeader>/g, '</div>')
      .replace(/<CardTitle([^>]*)>/g, '<h3 className="text-lg font-semibold">')
      .replace(/<\/CardTitle>/g, '</h3>')

      // Button components
      .replace(/<Button\s+([^>]*?)>/g, (_match, props) => {
        // Extract onClick and other props
        const onClickMatch = props.match(/onClick={([^}]+)}/);
        const onClick = onClickMatch ? ` onClick={${onClickMatch[1]}}` : '';

        // Determine button style based on variant
        let className = 'px-4 py-2 rounded transition-colors ';
        if (props.includes('variant="outline"')) {
          className += 'border border-gray-300 hover:bg-gray-100';
        } else if (props.includes('variant="ghost"')) {
          className += 'hover:bg-gray-100';
        } else if (props.includes('variant="destructive"')) {
          className += 'bg-red-500 text-white hover:bg-red-600';
        } else if (props.includes('variant="muted"')) {
          className += 'bg-gray-200 hover:bg-gray-300';
        } else {
          className += 'bg-blue-500 text-white hover:bg-blue-600';
        }

        // Extract disabled prop
        const disabled = props.includes('disabled') ? ' disabled' : '';

        return `<button className="${className}"${onClick}${disabled}>`;
      })
      .replace(/<\/Button>/g, '</button>')

      // Badge components
      .replace(
        /<Badge([^>]*)>/g,
        '<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">',
      )
      .replace(/<\/Badge>/g, '</span>')

      // Section components
      .replace(/<Section([^>]*)>/g, '<div className="mb-8">')
      .replace(/<\/Section>/g, '</div>')

      // Callout components
      .replace(
        /<Callout([^>]*)>/g,
        '<div className="p-4 border-l-4 border-blue-500 bg-blue-50">',
      )
      .replace(/<\/Callout>/g, '</div>')

      // Clean up any remaining className props that might be too specific
      .replace(/className="max-w-\w+ mx-auto"/g, 'className="mx-auto"')
      .replace(/className="([^"]*)\s+max-w-\w+([^"]*)"/g, 'className="$1$2"')
  );
}
