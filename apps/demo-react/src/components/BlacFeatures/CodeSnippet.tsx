interface CodeSnippetProps {
  code: string;
  language?: string;
}

export function CodeSnippet({ code }: CodeSnippetProps) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-md font-mono text-sm overflow-auto">
      <pre>{code}</pre>
    </div>
  );
} 