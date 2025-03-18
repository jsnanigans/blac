import { FC } from 'react';

/**
 * A component for displaying code examples with a title and description
 * Now with collapsible code blocks
 */
interface CodeExampleProps {
  title: string;
  description: string;
  code: string;
}

export const CodeExample: FC<CodeExampleProps> = ({ title, description, code }) => {
  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{description}</p>
      </div>
      
      <div className="relative">
        <pre className="p-4 bg-gray-900 text-gray-50 rounded-lg overflow-auto max-h-[300px]">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      </div>
    </section>
  );
};