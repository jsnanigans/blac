import { Link, useMatches } from '@tanstack/react-router';
import { cn } from '../utils/cn';

const navigationItems = [
  {
    name: 'Home',
    path: '/',
  },
  {
    name: 'Demo',
    path: '/demo',
  },
  {
    name: 'Docs',
    path: '/docs',
  },
];

export function NavigationItems() {
  const matches = useMatches();
  const currentPath = matches.length > 0 ? matches[0].pathname : '';

  return (
    <>
      {navigationItems.map((item) => (
        <li key={item.path}>
          <Link
            to={item.path}
            className={cn(
              'block py-2 pl-3 pr-4 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-blue-700 md:p-0 dark:text-gray-400 md:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent',
              {
                'text-white bg-blue-700 rounded md:bg-transparent md:text-blue-700 md:p-0 dark:text-white':
                  currentPath === item.path || currentPath.startsWith(`${item.path}/`),
              }
            )}
            aria-current={
              currentPath === item.path || currentPath.startsWith(`${item.path}/`)
                ? 'page'
                : undefined
            }
          >
            {item.name}
          </Link>
        </li>
      ))}
    </>
  );
}
