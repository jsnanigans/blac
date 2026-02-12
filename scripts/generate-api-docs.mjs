#!/usr/bin/env node
/**
 * Custom API documenter for VitePress
 * Reads api-extractor .api.json files and generates clean markdown
 * Outputs multiple pages organized by topic
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'apps/docs');
const API_OUTPUT_DIR = path.join(DOCS_DIR, 'api');

// Topic groupings for @blac/core
const CORE_TOPICS = {
  main: {
    title: '@blac/core',
    description: 'Core state management primitives',
    classes: ['StateContainer', 'Cubit', 'Vertex'],
    interfaces: ['StateContainerConfig', 'BaseEvent', 'SystemEventPayloads'],
    functions: ['blac'],
    types: [
      'SystemEvent',
      'ExtractState',
      'ExtractProps',
      'ExtractConstructorArgs',
    ],
  },
  registry: {
    title: 'Registry',
    description: 'Instance management and lifecycle',
    classes: ['StateContainerRegistry'],
    interfaces: ['InstanceEntry', 'InstanceMetadata'],
    functions: [],
    types: ['LifecycleEvent', 'LifecycleListener', 'BlocConstructor'],
  },
  plugins: {
    title: 'Plugins',
    description: 'Plugin system for extending BlaC',
    classes: ['PluginManager'],
    interfaces: [
      'BlacPlugin',
      'BlacPluginWithInit',
      'PluginConfig',
      'PluginContext',
    ],
    functions: ['createPluginManager', 'getPluginManager', 'hasInitHook'],
    types: [],
  },
  adapter: {
    title: 'Framework Adapter',
    description: 'Utilities for building framework integrations',
    classes: ['ExternalDepsManager', 'DependencyManager'],
    interfaces: ['AdapterState', 'ManualDepsConfig'],
    functions: [
      'autoTrackInit',
      'manualDepsInit',
      'noTrackInit',
      'autoTrackSubscribe',
      'manualDepsSubscribe',
      'noTrackSubscribe',
      'autoTrackSnapshot',
      'manualDepsSnapshot',
      'noTrackSnapshot',
      'disableGetterTracking',
    ],
    types: ['SnapshotFunction', 'SubscribeFunction', 'SubscriptionCallback'],
  },
  logging: {
    title: 'Logging',
    description: 'Logging utilities for debugging',
    classes: [],
    interfaces: ['LogConfig', 'LogEntry'],
    functions: [
      'createLogger',
      'configureLogger',
      'debug',
      'info',
      'warn',
      'error',
    ],
    types: [],
    enums: ['LogLevel'],
  },
  utilities: {
    title: 'Utilities',
    description: 'Helper functions, ID generation, and type utilities',
    classes: [],
    interfaces: [],
    functions: [
      'generateId',
      'generateSimpleId',
      'generateIsolatedKey',
      'createIdGenerator',
      'getStaticProp',
      'isIsolatedClass',
      'isIsolatedKey',
      'isKeepAliveClass',
      'isExcludedFromDevTools',
      'isStatelessClass',
    ],
    types: [
      'BlacOptions',
      'Brand',
      'BrandedId',
      'InstanceId',
      'EventConstructor',
      'EventHandler',
    ],
    variables: [
      'BLAC_DEFAULTS',
      'BLAC_ERROR_PREFIX',
      'BLAC_ID_PATTERNS',
      'BLAC_STATIC_PROPS',
      'globalRegistry',
    ],
  },
};

function sanitizeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\[native code\]/g, '`[native code]`')
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

  let cleaned = docComment
    .replace(/^\/\*\*\s*\n?/, '')
    .replace(/\s*\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();

  // Protect @ symbols inside code blocks from being parsed as tags
  const codeBlockPlaceholder = '___CODE_BLOCK___';
  const codeBlocks = [];
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `${codeBlockPlaceholder}${codeBlocks.length - 1}${codeBlockPlaceholder}`;
  });

  const paramRegex = /@param\s+(\w+)\s*[-–]?\s*([^@]*)/g;
  let match;
  while ((match = paramRegex.exec(cleaned)) !== null) {
    result.params[match[1]] = match[2].trim();
  }

  const returnsMatch = cleaned.match(/@returns?\s+([^@]*)/);
  if (returnsMatch) {
    result.returns = returnsMatch[1].trim();
  }

  // Match @example until the next @tag at line start (not inside code blocks)
  const exampleRegex = /@example\s*([\s\S]*?)(?=\n@\w|$)/g;
  while ((match = exampleRegex.exec(cleaned)) !== null) {
    let example = match[1].trim();
    // Restore code blocks in example
    example = example.replace(
      new RegExp(`${codeBlockPlaceholder}(\\d+)${codeBlockPlaceholder}`, 'g'),
      (_, idx) => codeBlocks[parseInt(idx)],
    );

    if (example) {
      // Check for title + code block pattern
      const codeBlockMatch = example.match(/^([^\n`]+)\n(```[\s\S]*?```)$/);
      if (codeBlockMatch) {
        const title = codeBlockMatch[1].trim();
        const code = codeBlockMatch[2].trim();
        example = `**${title}**\n\n${code}`;
      } else if (!example.includes('```')) {
        // No code block - check if first line is a title
        const lines = example.split('\n');
        const firstLine = lines[0];
        if (
          lines.length > 1 &&
          !firstLine.includes('(') &&
          !firstLine.includes('{') &&
          !firstLine.includes('=')
        ) {
          const title = firstLine.trim();
          const code = lines.slice(1).join('\n').trim();
          example = `**${title}**\n\n\`\`\`typescript\n${code}\n\`\`\``;
        }
      }
      result.examples.push(example);
    }
  }

  // Restore code blocks for description extraction
  cleaned = cleaned.replace(
    new RegExp(`${codeBlockPlaceholder}(\\d+)${codeBlockPlaceholder}`, 'g'),
    (_, idx) => codeBlocks[parseInt(idx)],
  );

  // Find first @tag that's at the start of a line
  const firstTagMatch = cleaned.match(/^@\w/m);
  if (firstTagMatch) {
    const firstTagIndex = cleaned.indexOf(firstTagMatch[0]);
    if (firstTagIndex > 0) {
      result.description = cleaned.slice(0, firstTagIndex).trim();
    }
  } else {
    result.description = cleaned;
  }

  return result;
}

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function generateClassMarkdown(cls, headingLevel = 3) {
  const doc = parseDocComment(cls.docComment);
  const signature = extractExcerpt(cls.excerptTokens);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${cls.name}\n\n`;

  if (cls.isAbstract) {
    md += `> **Abstract class**\n\n`;
  }

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  if (cls.typeParameters && cls.typeParameters.length > 0) {
    md += '**Type Parameters:**\n\n';
    for (const tp of cls.typeParameters) {
      md += `- \`${tp.typeParameterName}\`\n`;
    }
    md += '\n';
  }

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

  const properties = sortByName(
    cls.members.filter(
      (m) => m.kind === 'Property' || m.kind === 'PropertySignature',
    ),
  );
  if (properties.length > 0) {
    md += '**Properties:**\n\n';
    md += '| Property | Type | Description |\n';
    md += '|----------|------|-------------|\n';
    for (const prop of properties) {
      const propDoc = parseDocComment(prop.docComment);
      const signature = extractExcerpt(prop.excerptTokens);
      const typeMatch = signature.match(/:\s*(.+?)(?:;|$)/);
      const typeStr = typeMatch
        ? typeMatch[1].trim().replace(/\|/g, '\\|')
        : '';
      const modifiers = [];
      if (prop.isStatic) modifiers.push('static');
      if (prop.isReadonly) modifiers.push('readonly');
      if (prop.isOptional) modifiers.push('optional');
      const modStr =
        modifiers.length > 0 ? ` *(${modifiers.join(', ')})* ` : '';
      md += `| \`${prop.name}\`${modStr} | \`${typeStr}\` | ${propDoc.description} |\n`;
    }
    md += '\n';
  }

  const methods = sortByName(cls.members.filter((m) => m.kind === 'Method'));
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

  if (doc.examples.length > 0) {
    md += '**Examples:**\n\n';
    for (const example of doc.examples) {
      md += '\n' + example + '\n\n';
    }
  }

  return md;
}

function generateInterfaceMarkdown(iface, headingLevel = 3) {
  const doc = parseDocComment(iface.docComment);
  const signature = extractExcerpt(iface.excerptTokens);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${iface.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  const properties = sortByName(
    (iface.members || []).filter(
      (m) => m.kind === 'Property' || m.kind === 'PropertySignature',
    ),
  );
  if (properties.length > 0) {
    md += '| Property | Type | Description |\n';
    md += '|----------|------|-------------|\n';
    for (const prop of properties) {
      const propDoc = parseDocComment(prop.docComment);
      const signature = extractExcerpt(prop.excerptTokens);
      const typeMatch = signature.match(/:\s*(.+?)(?:;|$)/);
      const typeStr = typeMatch
        ? typeMatch[1].trim().replace(/\|/g, '\\|')
        : '';
      const optional = prop.isOptional ? ' *(optional)*' : '';
      md += `| \`${prop.name}\`${optional} | \`${typeStr}\` | ${propDoc.description} |\n`;
    }
    md += '\n';
  }

  const methods = sortByName(
    (iface.members || []).filter(
      (m) => m.kind === 'Method' || m.kind === 'MethodSignature',
    ),
  );
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

function generateFunctionMarkdown(fn, headingLevel = 3) {
  const doc = parseDocComment(fn.docComment);
  const signature = extractExcerpt(fn.excerptTokens);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${fn.name}\n\n`;

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
      if (example.includes('```')) {
        md += example + '\n\n';
      } else {
        md += '```typescript\n' + example + '\n```\n\n';
      }
    }
  }

  return md;
}

function generateTypeAliasMarkdown(alias, headingLevel = 3) {
  const doc = parseDocComment(alias.docComment);
  const signature = extractExcerpt(alias.excerptTokens);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${alias.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  return md;
}

function generateVariableMarkdown(variable, headingLevel = 3) {
  const doc = parseDocComment(variable.docComment);
  const signature = extractExcerpt(variable.excerptTokens);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${variable.name}\n\n`;

  if (doc.description) {
    md += `${doc.description}\n\n`;
  }

  md += '```typescript\n' + signature.trim() + '\n```\n\n';

  return md;
}

function generateEnumMarkdown(enumDef, headingLevel = 3) {
  const doc = parseDocComment(enumDef.docComment);
  const heading = '#'.repeat(headingLevel);
  let md = '';

  md += `${heading} ${enumDef.name}\n\n`;

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

function filterByNames(items, names) {
  return items.filter((item) => names.includes(item.name));
}

function generateTopicPage(
  topic,
  topicKey,
  allMembers,
  packageName,
  isMainPage = false,
) {
  const { classes, interfaces, functions, typeAliases, variables, enums } =
    allMembers;

  const topicClasses = sortByName(filterByNames(classes, topic.classes || []));
  const topicInterfaces = sortByName(
    filterByNames(interfaces, topic.interfaces || []),
  );
  const topicFunctions = sortByName(
    filterByNames(functions, topic.functions || []),
  );
  const topicTypes = sortByName(filterByNames(typeAliases, topic.types || []));
  const topicVariables = sortByName(
    filterByNames(variables, topic.variables || []),
  );
  const topicEnums = sortByName(filterByNames(enums, topic.enums || []));

  let md = '';
  md += `---\n`;
  md += `outline: [2, 3]\n`;
  md += `---\n\n`;

  if (isMainPage) {
    md += `# ${topic.title}\n\n`;
    md += `${topic.description}\n\n`;
    md += generateMainPageNavigation(packageName);
  } else {
    md += `# ${topic.title}\n\n`;
    md += `${topic.description}\n\n`;
    md += `<small>[← Back to ${packageName}](./index.md)</small>\n\n`;
  }

  // Quick reference for this page
  const allItems = [
    ...topicClasses.map((c) => ({ name: c.name, type: 'class' })),
    ...topicInterfaces.map((i) => ({ name: i.name, type: 'interface' })),
    ...topicFunctions.map((f) => ({ name: f.name, type: 'function' })),
    ...topicTypes.map((t) => ({ name: t.name, type: 'type' })),
    ...topicVariables.map((v) => ({ name: v.name, type: 'constant' })),
    ...topicEnums.map((e) => ({ name: e.name, type: 'enum' })),
  ];

  if (allItems.length > 0 && !isMainPage) {
    md += `## Quick Reference\n\n`;
    const grouped = {};
    for (const item of allItems) {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item.name);
    }
    for (const [type, names] of Object.entries(grouped)) {
      const label =
        type.charAt(0).toUpperCase() +
        type.slice(1) +
        (names.length > 1 ? 's' : '');
      md += `**${label}:** ${names.map((n) => `[\`${n}\`](#${n.toLowerCase()})`).join(', ')}\n\n`;
    }
  }

  if (topicClasses.length > 0) {
    md += `## Classes\n\n`;
    for (const cls of topicClasses) {
      md += generateClassMarkdown(cls);
      md += '---\n\n';
    }
  }

  if (topicInterfaces.length > 0) {
    md += `## Interfaces\n\n`;
    for (const iface of topicInterfaces) {
      md += generateInterfaceMarkdown(iface);
      md += '---\n\n';
    }
  }

  if (topicFunctions.length > 0) {
    md += `## Functions\n\n`;
    for (const fn of topicFunctions) {
      md += generateFunctionMarkdown(fn);
      md += '---\n\n';
    }
  }

  if (topicTypes.length > 0) {
    md += `## Types\n\n`;
    for (const alias of topicTypes) {
      md += generateTypeAliasMarkdown(alias);
    }
  }

  if (topicEnums.length > 0) {
    md += `## Enums\n\n`;
    for (const e of topicEnums) {
      md += generateEnumMarkdown(e);
    }
  }

  if (topicVariables.length > 0) {
    md += `## Constants\n\n`;
    for (const v of topicVariables) {
      md += generateVariableMarkdown(v);
    }
  }

  return md;
}

function generateMainPageNavigation(packageName) {
  let md = '';
  md += `## API Sections\n\n`;
  md += `| Section | Description |\n`;
  md += `|---------|-------------|\n`;
  md += `| [Registry](./core/registry.md) | Instance management and lifecycle |\n`;
  md += `| [Plugins](./core/plugins.md) | Plugin system for extending BlaC |\n`;
  md += `| [Framework Adapter](./core/adapter.md) | React integration and dependency tracking |\n`;
  md += `| [Logging](./core/logging.md) | Logging utilities for debugging |\n`;
  md += `| [Utilities](./core/utilities.md) | Helper functions, ID generation, and type utilities |\n`;
  md += `\n`;
  return md;
}

function parseApiJson(apiJson) {
  const entryPoint = apiJson.members[0];
  if (!entryPoint || entryPoint.kind !== 'EntryPoint') {
    return null;
  }

  const members = entryPoint.members;

  return {
    classes: members.filter((m) => m.kind === 'Class'),
    interfaces: members.filter((m) => m.kind === 'Interface'),
    functions: members.filter((m) => m.kind === 'Function'),
    typeAliases: members.filter((m) => m.kind === 'TypeAlias'),
    variables: members.filter((m) => m.kind === 'Variable'),
    enums: members.filter((m) => m.kind === 'Enum'),
  };
}

function generateCorePackageDocs(apiJson) {
  const allMembers = parseApiJson(apiJson);
  if (!allMembers) {
    return [
      { path: 'core.md', content: '# @blac/core\n\nNo API members found.\n' },
    ];
  }

  const pages = [];

  // Main page
  pages.push({
    path: 'core.md',
    content: generateTopicPage(
      CORE_TOPICS.main,
      'main',
      allMembers,
      '@blac/core',
      true,
    ),
  });

  // Sub-pages
  for (const [key, topic] of Object.entries(CORE_TOPICS)) {
    if (key === 'main') continue;
    pages.push({
      path: `core/${key}.md`,
      content: generateTopicPage(topic, key, allMembers, '@blac/core', false),
    });
  }

  return pages;
}

function generateReactPackageDocs(apiJson) {
  const allMembers = parseApiJson(apiJson);
  if (!allMembers) {
    return [
      { path: 'react.md', content: '# @blac/react\n\nNo API members found.\n' },
    ];
  }

  // For react, keep it simpler - single page for now
  const { classes, interfaces, functions, typeAliases, variables, enums } =
    allMembers;

  // Filter out example/internal items
  const importantClasses = sortByName(
    classes.filter(
      (c) =>
        !c.name.includes('Example') &&
        !c.name.includes('Counter') &&
        !c.name.includes('Todo') &&
        !c.name.includes('Auth') &&
        !c.name.endsWith('Event'),
    ),
  );

  const importantInterfaces = sortByName(
    interfaces.filter(
      (i) => !i.name.includes('Example') && !i.name.startsWith('_'),
    ),
  );
  const importantFunctions = sortByName(
    functions.filter((f) => !f.name.startsWith('_')),
  );
  const importantTypes = sortByName(typeAliases);
  const importantVariables = sortByName(variables);
  const importantEnums = sortByName(enums);

  let md = '';
  md += `---\n`;
  md += `outline: [2, 3]\n`;
  md += `---\n\n`;
  md += `# @blac/react\n\n`;
  md += `React integration hooks and components for BlaC state management.\n\n`;

  // Quick reference
  md += `## Quick Reference\n\n`;
  if (importantFunctions.length > 0) {
    md += `**Hooks:** ${importantFunctions.map((f) => `[\`${f.name}\`](#${f.name.toLowerCase()})`).join(', ')}\n\n`;
  }
  if (importantInterfaces.length > 0) {
    md += `**Interfaces:** ${importantInterfaces.map((i) => `[\`${i.name}\`](#${i.name.toLowerCase()})`).join(', ')}\n\n`;
  }
  if (importantTypes.length > 0) {
    md += `**Types:** ${importantTypes
      .slice(0, 8)
      .map((t) => `\`${t.name}\``)
      .join(', ')}${importantTypes.length > 8 ? ', ...' : ''}\n\n`;
  }

  if (importantClasses.length > 0) {
    md += `## Classes\n\n`;
    for (const cls of importantClasses) {
      md += generateClassMarkdown(cls);
      md += '---\n\n';
    }
  }

  if (importantFunctions.length > 0) {
    md += `## Hooks\n\n`;
    for (const fn of importantFunctions) {
      md += generateFunctionMarkdown(fn);
      md += '---\n\n';
    }
  }

  if (importantInterfaces.length > 0) {
    md += `## Interfaces\n\n`;
    for (const iface of importantInterfaces) {
      md += generateInterfaceMarkdown(iface);
      md += '---\n\n';
    }
  }

  if (importantTypes.length > 0) {
    md += `## Types\n\n`;
    for (const alias of importantTypes) {
      md += generateTypeAliasMarkdown(alias);
    }
  }

  if (importantEnums.length > 0) {
    md += `## Enums\n\n`;
    for (const e of importantEnums) {
      md += generateEnumMarkdown(e);
    }
  }

  if (importantVariables.length > 0) {
    md += `## Constants\n\n`;
    for (const v of importantVariables) {
      md += generateVariableMarkdown(v);
    }
  }

  return [{ path: 'react.md', content: md }];
}

const packages = [
  {
    inputPath: path.join(ROOT_DIR, 'packages/blac-core/temp/core.api.json'),
    shortName: 'core',
    title: '@blac/core',
    generator: generateCorePackageDocs,
  },
  {
    inputPath: path.join(ROOT_DIR, 'packages/blac-react/temp/react.api.json'),
    shortName: 'react',
    title: '@blac/react',
    generator: generateReactPackageDocs,
  },
];

function printSidebarConfig() {
  console.log('\nRecommended VitePress sidebar config:');
  console.log(`
    '/api/': [
      {
        text: 'API Reference',
        items: [
          {
            text: '@blac/core',
            collapsed: false,
            items: [
              { text: 'Overview', link: '/api/core' },
              { text: 'Registry', link: '/api/core/registry' },
              { text: 'Plugins', link: '/api/core/plugins' },
              { text: 'Framework Adapter', link: '/api/core/adapter' },
              { text: 'Utilities', link: '/api/core/utilities' },
            ],
          },
          { text: '@blac/react', link: '/api/react' },
        ],
      },
    ],`);
}

async function main() {
  console.log('Generating API documentation...\n');

  // Ensure output directories exist
  if (!fs.existsSync(API_OUTPUT_DIR)) {
    fs.mkdirSync(API_OUTPUT_DIR, { recursive: true });
  }
  const coreSubDir = path.join(API_OUTPUT_DIR, 'core');
  if (!fs.existsSync(coreSubDir)) {
    fs.mkdirSync(coreSubDir, { recursive: true });
  }

  for (const pkg of packages) {
    if (!fs.existsSync(pkg.inputPath)) {
      console.warn(
        `Warning: ${pkg.inputPath} not found, skipping ${pkg.title}`,
      );
      continue;
    }

    console.log(`Processing ${pkg.title}...`);
    const apiJson = JSON.parse(fs.readFileSync(pkg.inputPath, 'utf-8'));
    const pages = pkg.generator(apiJson);

    for (const page of pages) {
      const outputPath = path.join(API_OUTPUT_DIR, page.path);
      fs.writeFileSync(outputPath, page.content);
      console.log(`  -> ${outputPath}`);
    }
  }

  printSidebarConfig();

  console.log('\nDone!');
}

main().catch(console.error);
