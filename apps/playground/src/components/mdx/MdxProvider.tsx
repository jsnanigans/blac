import React from 'react';
import { MDXProvider } from '@mdx-js/react';
import { mdxComponents } from './MdxComponents';
import { GuideArticleNote } from '@/components/guide/GuideArticle';
import { CodePreview, CodeSplit } from './CodePreview';

// Extend the components with custom components that can be used in MDX
const components = {
  ...mdxComponents,
  // Add custom components here that can be imported/used in MDX files
  GuideArticleNote,
  CodePreview,
  CodeSplit,
};

interface MdxProviderProps {
  children: React.ReactNode;
}

export function MdxProvider({ children }: MdxProviderProps) {
  return <MDXProvider components={components}>{children}</MDXProvider>;
}
