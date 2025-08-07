import React from 'react';
import { Copy, Check } from 'lucide-react';
import { DemoCode } from '@/core/utils/demoRegistry';

interface CodeViewerProps {
  code: DemoCode;
}

export function CodeViewer({ code }: CodeViewerProps) {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const sections = [
    { key: 'bloc', label: 'Bloc/Cubit', content: code.bloc },
    { key: 'demo', label: 'Usage', content: code.demo },
    { key: 'test', label: 'Tests', content: code.test },
  ].filter(s => s.content);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.key} className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center justify-between">
            <h3 className="font-mono text-sm font-medium">{section.label}</h3>
            <button
              onClick={() => copyToClipboard(section.content!, section.key)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-background transition-colors"
            >
              {copiedSection === section.key ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-zinc-950">
            <pre className="text-zinc-100 text-sm overflow-x-auto">
              <code>{section.content}</code>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}