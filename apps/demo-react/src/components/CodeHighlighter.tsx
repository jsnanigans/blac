import React, { useState } from 'react';
// Import with type assertions
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeHighlighterProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  className?: string;
  customStyle?: React.CSSProperties;
  title?: string;
  highlightLines?: number[];
}

const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  language = 'typescript',
  showLineNumbers = true,
  showCopyButton = true,
  className = '',
  customStyle = {},
  title,
  highlightLines = [],
}) => {
  const [copied, setCopied] = useState(false);

  // Customize the atomDark theme for our neon cyberpunk style
  const customTheme = {
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
    'number': {
      ...atomDark['number'],
      color: '#f99157', // Orange for numbers
      textShadow: '0 0 8px rgba(249, 145, 87, 0.5)',
    },
    'boolean': {
      ...atomDark['boolean'],
      color: '#ff7b72', // Red-orange for booleans
      fontWeight: 'bold',
      textShadow: '0 0 8px rgba(255, 123, 114, 0.5)',
    },
    'builtin': {
      ...atomDark['builtin'],
      color: '#79e3ff', // Light blue for builtins
      textShadow: '0 0 8px rgba(121, 227, 255, 0.5)',
    },
    'tag': {
      ...atomDark['tag'],
      color: '#ff7edb', // Pink for tags
      textShadow: '0 0 8px rgba(255, 126, 219, 0.5)',
    },
    'attr-name': {
      ...atomDark['attr-name'],
      color: '#c5a5fe', // Lavender for attribute names
      textShadow: '0 0 8px rgba(197, 165, 254, 0.5)',
    },
    'attr-value': {
      ...atomDark['attr-value'],
      color: '#0ff5e9', // Cyan for attribute values
      textShadow: '0 0 8px rgba(15, 245, 233, 0.5)',
    },
  };

  const copyToClipboard = () => {
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
    <div className={`relative my-8 group w-full ${className}`}>
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
        {showCopyButton && (
          <button 
            onClick={copyToClipboard}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-semibold py-1 px-2 rounded-md bg-[#0ff5e920] hover:bg-[#0ff5e940] text-[#0ff5e9] border border-[#0ff5e950] focus:outline-none focus:ring-2 focus:ring-[#0ff5e9]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      
      {/* Code block with syntax highlighting */}
      <div className="overflow-hidden rounded-lg w-full">
        <div className="pt-10 max-h-[500px] overflow-auto cyberpunk-scrollbar">
          <SyntaxHighlighter
            language={language}
            style={customTheme}
            showLineNumbers={showLineNumbers}
            lineProps={getLineProps}
            wrapLines={true}
            customStyle={{
              borderRadius: '0 0 0.75rem 0.75rem',
              margin: 0,
              padding: '1.5rem',
              width: '100%',
              minWidth: '100%',
              overflowX: 'auto',
              ...customStyle
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
      
      {/* Decorative corner glows */}
      <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0ff5e9] opacity-60 blur-xl pointer-events-none"></div>
      <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-[#ff36f9] opacity-60 blur-xl pointer-events-none"></div>
    </div>
  );
};

// Add cyberpunk scrollbar styles
const style = document.createElement('style');
style.innerHTML = `
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
`;
document.head.appendChild(style);

export default CodeHighlighter; 