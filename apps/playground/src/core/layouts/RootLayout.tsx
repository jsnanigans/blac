import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { CommandPalette } from '@/core/components/CommandPalette';
import {
  AppShell,
  ShellTopBar,
  ShellHeader,
  ShellBody,
  ShellMain,
  ShellFooter,
} from '@/layouts/AppShell';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  ExternalLink,
  FlaskConical,
  Github,
  Home,
  Menu,
  Moon,
  PlayCircle,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { HeaderVisibilityProvider } from '@/hooks/useHeaderVisibility';

type NavigationItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
};

const docsUrl = 'http://localhost:5173/';
const navigation: NavigationItem[] = [
  { name: 'Home', href: '/', icon: Home, match: (path) => path === '/' },
  {
    name: 'Guide',
    href: '/guide',
    icon: BookOpen,
    match: (path) => path.startsWith('/guide'),
  },
  {
    name: 'Playground',
    href: '/playground',
    icon: PlayCircle,
    match: (path) => path.startsWith('/playground'),
  },
  {
    name: 'Experiments',
    href: '/prototype-test',
    icon: FlaskConical,
    match: (path) =>
      path.startsWith('/prototype-test') || path.startsWith('/graph-test'),
  },
];

export function RootLayout() {
  const location = useLocation();
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    const stored = localStorage.getItem('blac-theme');
    return stored ? stored === 'dark' : false;
  });
  const [isCmdOpen, setIsCmdOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const scrollDirection = useScrollDirection({ threshold: 10 });
  const scrollProgress = useScrollProgress();
  const [scrollY, setScrollY] = React.useState(0);

  // Track scroll position
  React.useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Determine if header should be hidden
  const shouldHideHeader = scrollDirection === 'down' && scrollY > 100;

  React.useEffect(() => {
    localStorage.setItem('blac-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

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

  const activeNav = (item: NavigationItem) => {
    if (item.match) return item.match(location.pathname);
    if (item.href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.href);
  };

  return (
    <HeaderVisibilityProvider>
      <AppShell>
        {/* Scroll Progress Indicator */}
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-brand via-accent to-brand transition-all duration-300 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div
          className={cn(
            'sticky top-0 z-40 transition-transform duration-300 ease-in-out',
            shouldHideHeader && '-translate-y-full',
          )}
        >
          <ShellTopBar>
          <div className="mx-auto flex h-10 w-full max-w-6xl items-center justify-between px-4 text-xs sm:text-sm">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-brand font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
                BlaC
              </span>
              <span className="hidden sm:inline text-xs font-semibold text-foreground">
                Playground
              </span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                vNext
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Docs
              </a>
              <a
                href="https://github.com/sst/blac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </a>
              <button
                onClick={() => setIsDark((prev) => !prev)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
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
        </ShellTopBar>

        <ShellHeader>
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                aria-label="Toggle navigation"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted lg:hidden"
                onClick={() => setIsMobileNavOpen((prev) => !prev)}
              >
                {isMobileNavOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </button>
              <nav className="hidden gap-2 text-sm font-medium lg:flex">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav(item);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                        isActive
                          ? 'bg-surface-muted text-foreground shadow-subtle'
                          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCmdOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface hidden sm:flex"
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">Search</span>
                <kbd className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
                <span className="sr-only">Open command palette</span>
              </button>
              <Link
                to="/playground"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-brand-foreground shadow-subtle transition-transform hover:translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <PlayCircle className="h-4 w-4" />
                Launch
              </Link>
            </div>
          </div>

          {isMobileNavOpen && (
            <div className="absolute left-0 right-0 top-full border-t border-border bg-surface shadow-elevated lg:hidden">
              <nav className="flex flex-col gap-1 px-4 py-3 text-sm font-medium">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav(item);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
                        isActive
                          ? 'bg-surface-muted text-foreground'
                          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </ShellHeader>
      </div>

      <ShellBody>
        <ShellMain>
          <Outlet />
        </ShellMain>
      </ShellBody>

      <ShellFooter>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row">
          <p className="text-center md:text-left">
            Built with BlaC. The source code is available on{' '}
            <a
              href="https://github.com/sst/blac"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
          <div className="inline-flex items-center gap-2 rounded-md bg-surface-muted px-2 py-1 text-xs">
            <span className="font-medium text-foreground">Workspace</span>
            <span className="text-muted-foreground">Design refresh in progress</span>
          </div>
        </div>
      </ShellFooter>

      <CommandPalette open={isCmdOpen} onOpenChange={setIsCmdOpen} />
    </AppShell>
    </HeaderVisibilityProvider>
  );
}
