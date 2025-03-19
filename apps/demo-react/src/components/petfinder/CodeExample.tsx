import { FC } from 'react';
import CodeHighlighter from '../CodeHighlighter';

/**
 * A component for displaying code examples with a title and description
 * Now with collapsible code blocks
 */
interface CodeExampleProps {
  title: string;
  description: string;
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeExample: FC<CodeExampleProps> = ({ 
  title, 
  description, 
  code, 
  language = 'typescript',
  showLineNumbers = true 
}) => {
  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{description}</p>
      </div>
      
      <CodeHighlighter
        code={code}
        language={language}
        showLineNumbers={showLineNumbers}
        className="mt-0"
      />
    </section>
  );
};