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
  theme?: 'cyan' | 'green' | 'fuchsia' | 'blue'; // Add theme support for different demos
}

const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  language = 'typescript',
  showLineNumbers = true,
  showCopyButton = true,
  className = '',
  customStyle = {},
  theme = 'cyan',
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Theme-specific shadow color
  const shadowColors = {
    cyan: 'shadow-cyan-900/10',
    green: 'shadow-green-900/10', 
    fuchsia: 'shadow-fuchsia-900/10',
    blue: 'shadow-blue-900/10',
  };

  // Customize the atomDark theme
  const syntaxStyle = {
    ...atomDark,
    'pre[class*="language-"]': {
      ...atomDark['pre[class*="language-"]'],
      background: '#1a1a2e',
      borderRadius: '0.5rem',
      margin: 0,
    }
  };

  return (
    <div className={`relative mt-4 ${className}`}>
      {showCopyButton && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={copyToClipboard}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      <div className={`overflow-x-auto shadow-inner ${shadowColors[theme]}`}>
        <SyntaxHighlighter
          language={language}
          style={syntaxStyle}
          showLineNumbers={showLineNumbers}
          customStyle={{
            borderRadius: '0.5rem',
            margin: 0,
            padding: '1.5rem',
            ...customStyle
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeHighlighter; 