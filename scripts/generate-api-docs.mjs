#!/usr/bin/env node
/**
 * Custom API documenter for VitePress
 * Reads api-extractor .api.json files and generates clean markdown
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'apps/docs');
const API_OUTPUT_DIR = path.join(DOCS_DIR, 'api');

function sanitizeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Escape [native code] which VitePress tries to parse as links
    .replace(/\[native code\]/g, '`[native code]`')
    // Escape other bracket patterns that look like links but aren't
    .replace(/function Object\(\) \{/g, '`function Object() {`');
}

function extractExcerpt(tokens) {
  return tokens.map((t) => t.text).join('');
}

function parseDocComment(docComment) {
  const result = {
    description: '',
    params: {},
    returns: '',
    examples: [],
  };

  if (!docComment) return result;

  // Remove /** and */ and clean up
  let cleaned = docComment
    .replace(/^\/\*\*\s*\n?/, '')
    .replace(/\s*\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();

  // Extract @param tags
  const paramRegex = /@param\s+(\w+)\s*[-–]?\s*([^@]*)/g;
  let match;
  while ((match = paramRegex.exec(cleaned)) !== null) {
    result.params[match[1]] = match[2].trim();
  }

  // Extract @returns
  const returnsMatch = cleaned.match(/@returns?\s+([^@]*)/);
  if (returnsMatch) {
    result.returns = returnsMatch[1].trim();
  }

  // Extract @example blocks
  const exampleRegex = /@example\s*([\s\S]*?)(?=@\w|$)/g;
  while ((match = exampleRegex.exec(cleaned)) !== null) {
    const example = match[1].trim();
    if (example) {
      result.examples.push(example);
    }
  }

  // Description is everything before the first @ tag
  const firstTagIndex = cleaned.search(/@\w/);
  if (firstTagIndex > 0) {
    result.description = cleaned.slice(0, firstTagIndex).trim();
  } else if (firstTagIndex === -1) {
    result.description = cleaned;
  }

  return result;
}

function generateClassMarkdown(cls) {
  const doc = parseDocComment(cls.docComment);
  const signature = extractExcerpt(cls.excerptTokens);
  let md = '';

  md += `### ${cls.name}\n\n`;

  if (cls.isAbstract) {
    md += `> **Abstract class**\n\n`;
  }

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  // Type parameters
  if (cls.typeParameters && cls.typeParameters.length > 0) {
    md += '**Type Parameters:**\n\n';
    for (const tp of cls.typeParameters) {
      md += `- \`${tp.typeParameterName}\`\n`;
    }
    md += '\n';
  }

  // Constructor
  const constructor = cls.members.find((m) => m.kind === 'Constructor');
  if (constructor) {
    const ctorSignature = extractExcerpt(constructor.excerptTokens);
    md += '**Constructor:**\n\n';
    md += '```typescript\n' + ctorSignature.trim() + '\n```\n\n';

    if (constructor.parameters && constructor.parameters.length > 0) {
      md += '| Parameter | Type | Description |\n';
      md += '|-----------|------|-------------|\n';
      const ctorDoc = parseDocComment(constructor.docComment);
      for (const param of constructor.parameters) {
        const typeTokens = constructor.excerptTokens.slice(
          param.parameterTypeTokenRange.startIndex,
          param.parameterTypeTokenRange.endIndex,
        );
        const typeStr = extractExcerpt(typeTokens).replace(/\|/g, '\\|');
        const paramDesc = ctorDoc.params[param.parameterName] || '';
        md += `| \`${param.parameterName}\` | \`${typeStr}\` | ${sanitizeMarkdown(paramDesc)} |\n`;
      }
      md += '\n';
    }
  }

  // Properties
  const properties = cls.members.filter(
    (m) => m.kind === 'Property' || m.kind === 'PropertySignature',
  );
  if (properties.length > 0) {
    md += '**Properties:**\n\n';
    md += '| Property | Type | Description |\n';
    md += '|----------|------|-------------|\n';
    for (const prop of properties) {
      const propDoc = parseDocComment(prop.docComment);
      const signature = extractExcerpt(prop.excerptTokens);
      // Extract type from signature like "name: Type"
      const typeMatch = signature.match(/:\s*(.+?)(?:;|$)/);
      const typeStr = typeMatch ? typeMatch[1].trim().replace(/\|/g, '\\|') : '';
      const modifiers = [];
      if (prop.isStatic) modifiers.push('static');
      if (prop.isReadonly) modifiers.push('readonly');
      if (prop.isOptional) modifiers.push('optional');
      const modStr = modifiers.length > 0 ? ` *(${modifiers.join(', ')})* ` : '';
      md += `| \`${prop.name}\`${modStr} | \`${typeStr}\` | ${propDoc.description} |\n`;
    }
    md += '\n';
  }

  // Methods
  const methods = cls.members.filter((m) => m.kind === 'Method');
  if (methods.length > 0) {
    md += '**Methods:**\n\n';
    for (const method of methods) {
      const methodDoc = parseDocComment(method.docComment);
      const signature = extractExcerpt(method.excerptTokens);
      const modifiers = [];
      if (method.isStatic) modifiers.push('static');
      if (method.isAbstract) modifiers.push('abstract');
      if (method.isProtected) modifiers.push('protected');
      const modStr = modifiers.length > 0 ? ` *(${modifiers.join(', ')})*` : '';

      md += `#### \`${method.name}\`${modStr}\n\n`;
      if (methodDoc.description) {
        md += `${methodDoc.description}\n\n`;
      }
      md += '```typescript\n' + signature.trim() + '\n```\n\n';

      if (method.parameters && method.parameters.length > 0) {
        md += '| Parameter | Type | Description |\n';
        md += '|-----------|------|-------------|\n';
        for (const param of method.parameters) {
          const typeTokens = method.excerptTokens.slice(
            param.parameterTypeTokenRange.startIndex,
            param.parameterTypeTokenRange.endIndex,
          );
          const typeStr = extractExcerpt(typeTokens).replace(/\|/g, '\\|');
          const paramDesc = methodDoc.params[param.parameterName] || '';
          md += `| \`${param.parameterName}\` | \`${typeStr}\` | ${sanitizeMarkdown(paramDesc)} |\n`;
        }
        md += '\n';
      }

      if (methodDoc.returns) {
        md += `**Returns:** ${methodDoc.returns}\n\n`;
      }
    }
  }

  // Examples
  if (doc.examples.length > 0) {
    md += '**Examples:**\n\n';
    for (const example of doc.examples) {
      md += '```typescript\n' + example + '\n```\n\n';
    }
  }

  return md;
}

function generateInterfaceMarkdown(iface) {
  const doc = parseDocComment(iface.docComment);
  const signature = extractExcerpt(iface.excerptTokens);
  let md = '';

  md += `### ${iface.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  // Properties
  const properties = (iface.members || []).filter(
    (m) => m.kind === 'Property' || m.kind === 'PropertySignature',
  );
  if (properties.length > 0) {
    md += '| Property | Type | Description |\n';
    md += '|----------|------|-------------|\n';
    for (const prop of properties) {
      const propDoc = parseDocComment(prop.docComment);
      const signature = extractExcerpt(prop.excerptTokens);
      const typeMatch = signature.match(/:\s*(.+?)(?:;|$)/);
      const typeStr = typeMatch ? typeMatch[1].trim().replace(/\|/g, '\\|') : '';
      const optional = prop.isOptional ? ' *(optional)*' : '';
      md += `| \`${prop.name}\`${optional} | \`${typeStr}\` | ${propDoc.description} |\n`;
    }
    md += '\n';
  }

  // Methods
  const methods = (iface.members || []).filter((m) => m.kind === 'Method' || m.kind === 'MethodSignature');
  if (methods.length > 0) {
    md += '**Methods:**\n\n';
    for (const method of methods) {
      const methodDoc = parseDocComment(method.docComment);
      const signature = extractExcerpt(method.excerptTokens);
      md += `#### \`${method.name}\`\n\n`;
      if (methodDoc.description) {
        md += `${methodDoc.description}\n\n`;
      }
      md += '```typescript\n' + signature.trim() + '\n```\n\n';
    }
  }

  return md;
}

function generateFunctionMarkdown(fn) {
  const doc = parseDocComment(fn.docComment);
  const signature = extractExcerpt(fn.excerptTokens);
  let md = '';

  md += `### ${fn.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  if (fn.parameters && fn.parameters.length > 0) {
    md += '| Parameter | Type | Description |\n';
    md += '|-----------|------|-------------|\n';
    for (const param of fn.parameters) {
      const typeTokens = fn.excerptTokens.slice(
        param.parameterTypeTokenRange.startIndex,
        param.parameterTypeTokenRange.endIndex,
      );
      const typeStr = extractExcerpt(typeTokens).replace(/\|/g, '\\|');
      const paramDesc = doc.params[param.parameterName] || '';
      md += `| \`${param.parameterName}\` | \`${typeStr}\` | ${paramDesc} |\n`;
    }
    md += '\n';
  }

  if (doc.returns) {
    md += `**Returns:** ${doc.returns}\n\n`;
  }

  if (doc.examples.length > 0) {
    md += '**Examples:**\n\n';
    for (const example of doc.examples) {
      md += '```typescript\n' + example + '\n```\n\n';
    }
  }

  return md;
}

function generateTypeAliasMarkdown(alias) {
  const doc = parseDocComment(alias.docComment);
  const signature = extractExcerpt(alias.excerptTokens);
  let md = '';

  md += `### ${alias.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  return md;
}

function generateVariableMarkdown(variable) {
  const doc = parseDocComment(variable.docComment);
  const signature = extractExcerpt(variable.excerptTokens);
  let md = '';

  md += `### ${variable.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  return md;
}

function generateEnumMarkdown(enumDef) {
  const doc = parseDocComment(enumDef.docComment);
  let md = '';

  md += `### ${enumDef.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  if (enumDef.members && enumDef.members.length > 0) {
    md += '| Member | Value | Description |\n';
    md += '|--------|-------|-------------|\n';
    for (const member of enumDef.members) {
      const memberDoc = parseDocComment(member.docComment);
      let value = '';
      if (member.initializerTokenRange && member.excerptTokens) {
        const valueTokens = member.excerptTokens.slice(
          member.initializerTokenRange.startIndex,
          member.initializerTokenRange.endIndex,
        );
        value = extractExcerpt(valueTokens);
      }
      md += `| \`${member.name}\` | \`${value}\` | ${memberDoc.description} |\n`;
    }
    md += '\n';
  }

  return md;
}

function generatePackageMarkdown(pkg, shortName) {
  const entryPoint = pkg.members[0];
  if (!entryPoint || entryPoint.kind !== 'EntryPoint') {
    return `# ${pkg.name} API Reference\n\nNo API members found.\n`;
  }

  const members = entryPoint.members;

  // Group by kind
  const classes = members.filter((m) => m.kind === 'Class');
  const interfaces = members.filter((m) => m.kind === 'Interface');
  const functions = members.filter((m) => m.kind === 'Function');
  const typeAliases = members.filter((m) => m.kind === 'TypeAlias');
  const variables = members.filter((m) => m.kind === 'Variable');
  const enums = members.filter((m) => m.kind === 'Enum');

  // Filter to only important/public items (skip example classes, internal utilities)
  const importantClasses = classes.filter(
    (c) =>
      !c.name.includes('Example') &&
      !c.name.includes('Counter') &&
      !c.name.includes('Todo') &&
      !c.name.includes('Auth') &&
      !c.name.endsWith('Event'),
  );

  const importantInterfaces = interfaces.filter(
    (i) => !i.name.includes('Example') && !i.name.startsWith('_'),
  );

  const importantFunctions = functions.filter((f) => !f.name.startsWith('_'));

  let md = '';
  md += `---\n`;
  md += `outline: [2, 3]\n`;
  md += `---\n\n`;
  md += `# ${pkg.name}\n\n`;

  // Table of contents
  md += `## Overview\n\n`;
  if (importantClasses.length > 0) {
    md += `**Classes:** ${importantClasses.map((c) => `[\`${c.name}\`](#${c.name.toLowerCase()})`).join(', ')}\n\n`;
  }
  if (importantInterfaces.length > 0) {
    md += `**Interfaces:** ${importantInterfaces.map((i) => `[\`${i.name}\`](#${i.name.toLowerCase()})`).join(', ')}\n\n`;
  }
  if (importantFunctions.length > 0) {
    md += `**Functions:** ${importantFunctions.map((f) => `[\`${f.name}\`](#${f.name.toLowerCase()})`).join(', ')}\n\n`;
  }
  if (typeAliases.length > 0) {
    md +=
      `**Types:** ${typeAliases.slice(0, 10).map((t) => `\`${t.name}\``).join(', ')}` +
      (typeAliases.length > 10 ? ', ...' : '') +
      '\n\n';
  }

  // Classes
  if (importantClasses.length > 0) {
    md += `## Classes\n\n`;
    for (const cls of importantClasses) {
      md += generateClassMarkdown(cls);
      md += '---\n\n';
    }
  }

  // Interfaces
  if (importantInterfaces.length > 0) {
    md += `## Interfaces\n\n`;
    for (const iface of importantInterfaces) {
      md += generateInterfaceMarkdown(iface);
      md += '---\n\n';
    }
  }

  // Functions
  if (importantFunctions.length > 0) {
    md += `## Functions\n\n`;
    for (const fn of importantFunctions) {
      md += generateFunctionMarkdown(fn);
      md += '---\n\n';
    }
  }

  // Type Aliases (summarized)
  if (typeAliases.length > 0) {
    md += `## Type Aliases\n\n`;
    for (const alias of typeAliases) {
      md += generateTypeAliasMarkdown(alias);
    }
  }

  // Variables
  if (variables.length > 0) {
    md += `## Constants\n\n`;
    for (const v of variables) {
      md += generateVariableMarkdown(v);
    }
  }

  // Enums
  if (enums.length > 0) {
    md += `## Enums\n\n`;
    for (const e of enums) {
      md += generateEnumMarkdown(e);
    }
  }

  return md;
}

const packages = [
  {
    inputPath: path.join(ROOT_DIR, 'packages/blac/temp/core.api.json'),
    outputPath: path.join(API_OUTPUT_DIR, 'core.md'),
    shortName: 'core',
    title: '@blac/core',
  },
  {
    inputPath: path.join(ROOT_DIR, 'packages/blac-react/temp/react.api.json'),
    outputPath: path.join(API_OUTPUT_DIR, 'react.md'),
    shortName: 'react',
    title: '@blac/react',
  },
];

function checkVitepressSidebar() {
  const configPath = path.join(DOCS_DIR, '.vitepress/config.ts');
  const config = fs.readFileSync(configPath, 'utf-8');

  // Check if sidebar already has the correct API entries
  const hasCore = config.includes("link: '/api/core'");
  const hasReact = config.includes("link: '/api/react'");

  if (!hasCore || !hasReact) {
    console.log('\nNote: Update your .vitepress/config.ts sidebar to include:');
    console.log(`
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: '@blac/core', link: '/api/core' },
            { text: '@blac/react', link: '/api/react' },
          ],
        },
      ],`);
  }
}

async function main() {
  console.log('Generating API documentation...\n');

  // Ensure output directory exists
  if (!fs.existsSync(API_OUTPUT_DIR)) {
    fs.mkdirSync(API_OUTPUT_DIR, { recursive: true });
  }

  for (const pkg of packages) {
    if (!fs.existsSync(pkg.inputPath)) {
      console.warn(`Warning: ${pkg.inputPath} not found, skipping ${pkg.title}`);
      continue;
    }

    console.log(`Processing ${pkg.title}...`);
    const apiJson = JSON.parse(fs.readFileSync(pkg.inputPath, 'utf-8'));
    const markdown = generatePackageMarkdown(apiJson, pkg.shortName);
    fs.writeFileSync(pkg.outputPath, markdown);
    console.log(`  -> ${pkg.outputPath}`);
  }

  // Check VitePress sidebar config
  checkVitepressSidebar();

  console.log('\nDone!');
}

main().catch(console.error);
