import React, { useState } from 'react';
// Import with type assertions
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Remove invalid module declarations

interface DocSectionProps {
  title: string;
  children: React.ReactNode;
  id?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function DocSection({ title, children, id, tag = 'h2' }: DocSectionProps) {
  const HeadingTag = tag;
  const sectionClasses = tag === 'h1' ? 'mb-10' : 'mb-8';
  const headingClasses = tag === 'h1' 
    ? 'text-4xl font-bold mb-6 pb-2 border-b border-gray-200 dark:border-gray-700'
    : tag === 'h2'
      ? 'text-3xl font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700' 
      : tag === 'h3'
        ? 'text-2xl font-bold mb-3'
        : 'text-xl font-bold mb-2';
  
  return (
    <section className={sectionClasses} id={id}>
      <HeadingTag className={headingClasses}>{title}</HeadingTag>
      {children}
    </section>
  );
}

interface DocNoteProps {
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'error';
}

export function DocNote({ title, children, type = 'info' }: DocNoteProps) {
  const colors = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      title: 'text-blue-800 dark:text-blue-300',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      title: 'text-amber-800 dark:text-amber-300',
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      title: 'text-green-800 dark:text-green-300',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      title: 'text-red-800 dark:text-red-300',
    },
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className={`${colors[type].bg} p-6 rounded-lg border ${colors[type].border} my-6`}>
      {title && (
        <div className="flex items-center mb-2">
          <span className={`${colors[type].title} mr-2`}>{icons[type]}</span>
          <h3 className={`${colors[type].title} font-bold text-lg mt-0`}>{title}</h3>
        </div>
      )}
      <div className="text-gray-800 dark:text-gray-200">
        {children}
      </div>
    </div>
  );
}

interface DocCodeProps {
  children: React.ReactNode;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export function DocCode({ children, language = 'typescript', title, showLineNumbers = true, highlightLines = [] }: DocCodeProps) {
  const [copied, setCopied] = useState(false);

  // Customize the atomDark theme for our neon cyberpunk style
  const customStyle = {
    ...atomDark,
    'pre[class*="language-"]': {
      ...atomDark['pre[class*="language-"]'],
      background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
      borderRadius: '0.75rem',
      boxShadow: '0 10px 20px rgba(2, 12, 27, 0.4), 0 0 10px rgba(255, 0, 222, 0.1) inset, 0 0 20px rgba(0, 255, 255, 0.1) inset',
      border: '1px solid rgba(128, 0, 255, 0.2)',
      margin: 0,
      overflow: 'auto',
    },
    'code[class*="language-"]': {
      ...atomDark['code[class*="language-"]'],
      textShadow: '0 0 2px #ff00ff50',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
    },
    'keyword': {
      ...atomDark['keyword'],
      color: '#ff36f9', // Bright pink for keywords
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(255, 54, 249, 0.6)',
    },
    'string': {
      ...atomDark['string'],
      color: '#0ff5e9', // Cyan for strings
      textShadow: '0 0 8px rgba(15, 245, 233, 0.5)',
    },
    'class-name': {
      ...atomDark['class-name'],
      color: '#f6fa70', // Yellow for class names
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(246, 250, 112, 0.5)',
    },
    'function': {
      ...atomDark['function'],
      color: '#36f9c9', // Turquoise for functions
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(54, 249, 201, 0.5)',
    },
    'comment': {
      ...atomDark['comment'],
      color: '#64748b', // Slate for comments
      fontStyle: 'italic',
    },
    'operator': {
      ...atomDark['operator'],
      color: '#c792ea', // Purple for operators
      textShadow: '0 0 8px rgba(199, 146, 234, 0.5)',
    },
    'property': {
      ...atomDark['property'],
      color: '#80ffea', // Light cyan for properties
      textShadow: '0 0 8px rgba(128, 255, 234, 0.5)',
    },
    'punctuation': {
      ...atomDark['punctuation'],
      color: '#a6accd', // Light slate for punctuation
    },
  };

  // Function to copy code to clipboard
  const copyToClipboard = () => {
    const code = typeof children === 'string' ? children : '';
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getLineProps = (lineNumber: number) => {
    if (highlightLines.includes(lineNumber)) {
      return { 
        style: { 
          display: 'block',
          backgroundColor: 'rgba(255, 54, 249, 0.1)',
          borderLeft: '3px solid #ff36f9',
          paddingLeft: '0.75rem', 
        }
      };
    }
    return {};
  };

  return (
    <div className="relative my-8 group">
      {/* Title bar */}
      <div className="absolute z-10 top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#1a1a2e] border-b border-[#ff36f950] rounded-t-lg overflow-hidden">
        {/* Tech-inspired decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ff36f9] to-[#0ff5e9]"></div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-[#ff36f9] to-transparent"></div>
        <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-gradient-to-b from-[#0ff5e9] to-transparent"></div>
        
        {/* Title or Language badge */}
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-[#ff3547] mr-2"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffdd00] mr-2"></div>
          <div className="w-3 h-3 rounded-full bg-[#00ff44] mr-3"></div>
          
          {title ? (
            <span className="font-mono text-sm text-gray-300">{title}</span>
          ) : (
            <div className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#ff36f9] text-white">
              {language}
            </div>
          )}
        </div>
        
        {/* Copy button */}
        <button 
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold py-1 px-2 rounded-md bg-[#0ff5e920] hover:bg-[#0ff5e940] text-[#0ff5e9] border border-[#0ff5e950] focus:outline-none focus:ring-2 focus:ring-[#0ff5e9]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* Code block with syntax highlighting */}
      <div className={`overflow-hidden rounded-lg ${title ? 'mt-0' : 'mt-0'}`}>
        <div className="pt-10 overflow-auto cyberpunk-scrollbar">
          <SyntaxHighlighter
            language={language}
            style={customStyle}
            showLineNumbers={showLineNumbers}
            lineProps={getLineProps}
            wrapLines={true}
            customStyle={{
              borderRadius: '0 0 0.75rem 0.75rem',
              margin: 0,
              padding: '1.5rem',
            }}
          >
            {typeof children === 'string' ? children : ''}
          </SyntaxHighlighter>
        </div>
      </div>
      
      {/* Decorative corner glows */}
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0ff5e9] opacity-60 blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[#ff36f9] opacity-60 blur-xl pointer-events-none"></div>
    </div>
  );
}

// Use inline styles for the CyberpunkStyles component
const CyberpunkStyles: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .cyberpunk-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-track {
      background: rgba(26, 26, 46, 0.6);
      border-radius: 4px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #ff36f9, #0ff5e9);
      border-radius: 4px;
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #ff36f9, #0ff5e9);
    }
    .cyberpunk-scrollbar::-webkit-scrollbar-corner {
      background: transparent;
    }
    
    /* For Firefox */
    .cyberpunk-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #ff36f9 rgba(26, 26, 46, 0.6);
    }
  `}} />
);

interface DocFeatureGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export function DocFeatureGrid({ children, columns = 2 }: DocFeatureGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6 my-6`}>
      {children}
    </div>
  );
}

interface DocFeatureProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}

export function DocFeature({ title, children, icon, color = 'blue' }: DocFeatureProps) {
  const colors = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      text: 'text-blue-500 dark:text-blue-300',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/40',
      text: 'text-green-500 dark:text-green-300',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/40',
      text: 'text-purple-500 dark:text-purple-300',
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      text: 'text-amber-500 dark:text-amber-300',
    },
  };

  return (
    <div className="flex items-start">
      {icon && (
        <div className={`${colors[color].bg} p-3 rounded-full mr-4`}>
          <div className={`w-6 h-6 ${colors[color].text}`}>{icon}</div>
        </div>
      )}
      <div>
        <h3 className="text-xl font-bold mt-0">{title}</h3>
        <div className="text-gray-600 dark:text-gray-400">{children}</div>
      </div>
    </div>
  );
}

export function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
        {children}
      </table>
    </div>
  );
}

// Export the styles component
export { CyberpunkStyles };