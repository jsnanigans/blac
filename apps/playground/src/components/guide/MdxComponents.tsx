import React from 'react';
import { CodeBlock } from './CodeBlock';
import { DemoPreview } from './DemoPreview';
import {
  GuideArticleNote,
  InfoNote,
  WarningNote,
  DangerNote,
  SuccessNote,
} from './GuideArticle';
import { cn } from '@/lib/utils';

// Import interactive demo components
import { HelloWorldInteractive } from '@/demos/01-basics/hello-world/HelloWorldDemo';
import { CounterInteractive } from '@/demos/01-basics/counter/CounterDemo';
import { ReadingStateInteractive } from '@/demos/01-basics/reading-state/ReadingStateInteractive';
import { UpdatingStateInteractive } from '@/demos/01-basics/updating-state/UpdatingStateInteractive';
import { InstanceManagementInteractive } from '@/demos/01-basics/instance-management/InstanceManagementInteractive';
import { CubitDeepDiveInteractive } from '@/demos/02-core-concepts/cubit-deep-dive/CubitDeepDiveInteractive';
import { BlocDeepDiveInteractive } from '@/demos/02-core-concepts/bloc-deep-dive/BlocDeepDiveInteractive';
import { BlocVsCubitInteractive } from '@/demos/02-core-concepts/bloc-vs-cubit/BlocVsCubitInteractive';
import { ComputedPropertiesInteractive } from '@/demos/02-core-concepts/computed-properties/ComputedPropertiesInteractive';
import { LifecycleInteractive } from '@/demos/02-core-concepts/lifecycle/LifecycleInteractive';
import { SimpleFormInteractive } from '@/demos/03-patterns/simple-form/SimpleFormInteractive';
import { FormValidationInteractive } from '@/demos/03-patterns/form-validation/FormValidationInteractive';
import { AsyncLoadingInteractive } from '@/demos/03-patterns/async-loading/AsyncLoadingInteractive';
import { DataFetchingInteractive } from '@/demos/03-patterns/data-fetching/DataFetchingInteractive';
import { ListManagementInteractive } from '@/demos/03-patterns/list-management/ListManagementInteractive';
import { FilteringSortingInteractive } from '@/demos/03-patterns/filtering-sorting/FilteringSortingInteractive';
import { EventDesignInteractive } from '@/demos/03-patterns/event-design/EventDesignInteractive';
import { TodoBlocInteractive } from '@/demos/03-patterns/todo-bloc/TodoBlocInteractive';
import { KeepAliveInteractive } from '@/demos/03-patterns/keep-alive/KeepAliveInteractive';
import { PropsInteractive } from '@/demos/03-patterns/props/PropsInteractive';
import { PersistenceInteractive } from '@/demos/03-patterns/persistence/PersistenceInteractive';
import { StreamInteractive } from '@/demos/03-advanced/stream/StreamInteractive';
import { BlocCompositionInteractive } from '@/demos/03-advanced/bloc-composition/BlocCompositionInteractive';
import { DependenciesInteractive } from '@/demos/03-advanced/dependencies/DependenciesInteractive';
import { AsyncOperationsInteractive } from '@/demos/03-advanced/async-operations/AsyncOperationsInteractive';
import { CustomSelectorsInteractive } from '@/demos/03-advanced/custom-selectors/CustomSelectorsInteractive';
import { SchemaValidationInteractive } from '@/demos/03-advanced/schema-validation/SchemaValidationInteractive';
import { FormValidationSchemaDemo } from '@/demos/03-advanced/schema-validation/FormValidationSchemaDemo';
import { CharacterStatsDemo } from '@/demos/03-advanced/schema-validation/CharacterStatsDemo';
import { CustomPluginsInteractive } from '@/demos/04-plugins/custom-plugins/CustomPluginsInteractive';

// Custom heading components with anchor support
function H2({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) {
  return (
    <h2
      className="mt-10 mb-4 text-2xl font-semibold tracking-tight text-foreground"
      {...props}
    >
      {children}
    </h2>
  );
}

function H3({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) {
  return (
    <h3
      className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground"
      {...props}
    >
      {children}
    </h3>
  );
}

function H4({ children, ...props }: React.HTMLProps<HTMLHeadingElement>) {
  return (
    <h4
      className="mt-6 mb-2 text-lg font-semibold tracking-tight text-foreground"
      {...props}
    >
      {children}
    </h4>
  );
}

// Custom paragraph component
function P({ children, ...props }: React.HTMLProps<HTMLParagraphElement>) {
  return (
    <p className="mb-4 leading-7 text-foreground" {...props}>
      {children}
    </p>
  );
}

// Custom list components
function Ul({ children, ...props }: React.HTMLProps<HTMLUListElement>) {
  return (
    <ul className="my-4 ml-6 list-disc space-y-1 text-foreground" {...props}>
      {children}
    </ul>
  );
}

function Ol({
  children,
  ...props
}: React.OlHTMLAttributes<HTMLOListElement> & { children?: React.ReactNode }) {
  return (
    <ol className="my-4 ml-6 list-decimal space-y-1 text-foreground" {...props}>
      {children}
    </ol>
  );
}

function Li({ children, ...props }: React.HTMLProps<HTMLLIElement>) {
  return (
    <li className="my-1 text-foreground" {...props}>
      {children}
    </li>
  );
}

// Custom code components
function Pre({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) {
  return <div {...props}>{children}</div>;
}

function Code({ children, className, ...props }: React.HTMLProps<HTMLElement>) {
  const isInline = !className;
  return (
    <CodeBlock inline={isInline} className={className} {...props}>
      {String(children)}
    </CodeBlock>
  );
}

// Custom strong component
function Strong({ children, ...props }: React.HTMLProps<HTMLElement>) {
  return (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  );
}

// Custom link component
function A({ children, href, ...props }: React.HTMLProps<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand"
      {...props}
    >
      {children}
    </a>
  );
}

// Custom blockquote component
function Blockquote({ children, ...props }: React.HTMLProps<HTMLQuoteElement>) {
  return (
    <blockquote
      className="my-4 border-l-4 border-brand/30 bg-muted pl-4 py-2 italic text-muted-foreground"
      {...props}
    >
      {children}
    </blockquote>
  );
}

// Custom table components
function Table({ children, ...props }: React.HTMLProps<HTMLTableElement>) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

function Thead({
  children,
  ...props
}: React.HTMLProps<HTMLTableSectionElement>) {
  return (
    <thead className="border-b-2 border-border bg-surface-muted" {...props}>
      {children}
    </thead>
  );
}

function Tbody({
  children,
  ...props
}: React.HTMLProps<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

function Tr({ children, ...props }: React.HTMLProps<HTMLTableRowElement>) {
  return (
    <tr className="border-b border-border last:border-0" {...props}>
      {children}
    </tr>
  );
}

function Th({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) {
  return (
    <th
      className="px-4 py-2 text-left font-semibold text-foreground"
      {...props}
    >
      {children}
    </th>
  );
}

function Td({ children, ...props }: React.HTMLProps<HTMLTableCellElement>) {
  return (
    <td className="px-4 py-2 text-foreground" {...props}>
      {children}
    </td>
  );
}

// Export all custom components for MDX
export const mdxComponents = {
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  pre: Pre,
  code: Code,
  strong: Strong,
  a: A,
  blockquote: Blockquote,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
  // Custom components available in MDX
  DemoPreview,
  GuideArticleNote,
  InfoNote,
  WarningNote,
  DangerNote,
  SuccessNote,
  // Interactive demo components
  HelloWorldInteractive,
  CounterInteractive,
  ReadingStateInteractive,
  UpdatingStateInteractive,
  InstanceManagementInteractive,
  CubitDeepDiveInteractive,
  BlocDeepDiveInteractive,
  BlocVsCubitInteractive,
  ComputedPropertiesInteractive,
  LifecycleInteractive,
  SimpleFormInteractive,
  FormValidationInteractive,
  AsyncLoadingInteractive,
  DataFetchingInteractive,
  ListManagementInteractive,
  FilteringSortingInteractive,
  EventDesignInteractive,
  TodoBlocInteractive,
  KeepAliveInteractive,
  PropsInteractive,
  PersistenceInteractive,
  StreamInteractive,
  BlocCompositionInteractive,
  DependenciesInteractive,
  AsyncOperationsInteractive,
  CustomSelectorsInteractive,
  SchemaValidationInteractive,
  FormValidationSchemaDemo,
  CharacterStatsDemo,
  CustomPluginsInteractive,
};
