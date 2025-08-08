import { DemoCode } from '@/core/utils/demoRegistry';
import { Card, CardContent } from '@/ui/Card';
import { Check, Copy } from 'lucide-react';
import React from 'react';

interface CodeViewerProps {
  code: DemoCode;
}

export function CodeViewer({ code }: CodeViewerProps) {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);
  const share = (content: string) => {
    const url = new URL(window.location.origin + '/playground');
    const encoded = btoa(unescape(encodeURIComponent(content)));
    url.searchParams.set('code', encoded);
    navigator.clipboard.writeText(url.toString());
  };

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
  ].filter((s) => s.content);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.key} className="overflow-hidden">
          <div className="bg-muted px-4 py-2 flex items-center justify-between">
            <h3 className="font-mono text-sm font-medium tracking-tight">
              {section.label}
            </h3>
            <div>
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
              <button
                onClick={() => share(section.content!)}
                className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-background transition-colors"
                title="Copy a link that opens this code in the Playground"
              >
                Share
              </button>
            </div>
          </div>
          <CardContent className="p-0">
            <pre className="bg-zinc-950 text-zinc-100 text-sm overflow-x-auto px-4 py-3">
              <code>{section.content}</code>
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
