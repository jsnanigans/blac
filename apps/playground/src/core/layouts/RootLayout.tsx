import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Code2,
  PlayCircle,
  Search,
  Github,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react';
import { CommandPalette } from '@/core/components/CommandPalette';

export function RootLayout() {
  const location = useLocation();
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    const stored = localStorage.getItem('blac-theme');
    return stored ? stored === 'dark' : false;
  });
  const [isCmdOpen, setIsCmdOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem('blac-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // ⌘K / Ctrl+K command palette
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMetaK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (isMetaK) {
        e.preventDefault();
        setIsCmdOpen((v) => !v);
      }
      if (e.key === 'Escape') setIsCmdOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Demos', href: '/demos', icon: Code2 },
    { name: 'Playground', href: '/playground', icon: PlayCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight">
                BlaC Playground
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' &&
                    location.pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-1 transition-colors hover:text-foreground/80',
                      isActive ? 'text-foreground' : 'text-foreground/60',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end space-x-2">
            <a
              href="http://localhost:5173/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 border"
            >
              <span>Docs</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              onClick={() => setIsCmdOpen(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 border hidden sm:flex"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
              <kbd className="ml-2 hidden md:inline rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
              <span className="sr-only">Search</span>
            </button>

            <a
              href="https://github.com/sst/blac"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
            >
              <Github className="h-4 w-4" />
              <span className="sr-only">GitHub</span>
            </a>

            <button
              onClick={() => setIsDark(!isDark)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="w-full px-4 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built with BlaC. The source code is available on{' '}
            <a
              href="https://github.com/sst/blac"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </footer>

      {/* Command Palette */}
      <CommandPalette open={isCmdOpen} onOpenChange={setIsCmdOpen} />
    </div>
  );
}
