import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { DemoRegistry } from '@/core/utils/demoRegistry';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');

  const demos = React.useMemo(() => {
    if (!query) return DemoRegistry.getAllDemos();
    return DemoRegistry.search(query);
  }, [query]);

  const onSelect = (category: string, id: string) => {
    onOpenChange(false);
    navigate(`/demos/${category}/${id}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-24 z-50 w-[90vw] max-w-2xl -translate-x-1/2 overflow-hidden rounded-xl border bg-background shadow-2xl">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search demos, pages, API…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Dialog.Close className="rounded-md p-1 hover:bg-accent">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {demos.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                No matches
              </div>
            ) : (
              <ul className="divide-y">
                {demos.map((demo) => (
                  <li key={demo.id}>
                    <button
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                      onClick={() => onSelect(demo.category, demo.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{demo.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {demo.description}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {demo.category}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <div>Tip: Press ⌘K / Ctrl+K anywhere to open</div>
            <div className="hidden gap-1 md:flex">
              <kbd className="rounded border bg-background px-1.5 py-0.5">
                Esc
              </kbd>
              <span>to close</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
