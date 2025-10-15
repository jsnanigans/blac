import React from 'react';
import { cn } from '@/lib/utils';

// Custom heading components
export function H1({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-4xl font-bold tracking-tight text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function H2({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'mt-10 scroll-m-20 border-b border-border pb-2 text-3xl font-semibold tracking-tight text-foreground first:mt-0',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function H3({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'mt-8 scroll-m-20 text-2xl font-semibold tracking-tight text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function H4({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        'mt-6 scroll-m-20 text-xl font-semibold tracking-tight text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h4>
  );
}

// Paragraph
export function P({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('mb-4 leading-7 text-muted-foreground [&:not(:first-child)]:mt-4', className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Lists
export function Ul({ children, className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn('my-4 ml-6 list-disc [&>li]:mt-2', className)} {...props}>
      {children}
    </ul>
  );
}

export function Ol({ children, className, ...props }: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol className={cn('my-4 ml-6 list-decimal [&>li]:mt-2', className)} {...props}>
      {children}
    </ol>
  );
}

export function Li({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn('text-muted-foreground', className)} {...props}>
      {children}
    </li>
  );
}

// Inline code
export function InlineCode({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
}

// Code block
export function Pre({ children, className, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={cn(
        'mb-4 mt-4 overflow-x-auto rounded-lg border border-border bg-muted p-4',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  );
}

export function CodeBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn('relative rounded font-mono text-sm text-foreground', className)}
      {...props}
    >
      {children}
    </code>
  );
}

// Blockquote
export function Blockquote({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className={cn(
        'mt-4 border-l-4 border-border pl-4 italic text-muted-foreground [&>*]:text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}

// Horizontal rule
export function Hr({ className, ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn('my-8 border-border', className)} {...props} />;
}

// Links
export function A({
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        'font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

// Strong
export function Strong({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <strong className={cn('font-semibold text-foreground', className)} {...props}>
      {children}
    </strong>
  );
}

// Tables
export function Table({
  children,
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-4 w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Thead({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-border', className)} {...props}>
      {children}
    </thead>
  );
}

export function Tbody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props}>{children}</tbody>;
}

export function Tr({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('border-b border-border', className)} {...props}>
      {children}
    </tr>
  );
}

export function Th({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-2 text-left font-semibold text-foreground [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-2 text-muted-foreground [&[align=center]]:text-center [&[align=right]]:text-right',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

// Export all components as a single object for MDXProvider
export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  code: InlineCode,
  pre: Pre,
  blockquote: Blockquote,
  hr: Hr,
  a: A,
  strong: Strong,
  table: Table,
  thead: Thead,
  tbody: Tbody,
  tr: Tr,
  th: Th,
  td: Td,
};
