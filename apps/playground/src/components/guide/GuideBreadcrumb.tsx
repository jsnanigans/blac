import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { BreadcrumbItem } from './types';

interface GuideBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function GuideBreadcrumb({ items, className }: GuideBreadcrumbProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      {/* Home icon for the first item */}
      {items.length > 0 && (
        <>
          {items[0].path ? (
            <Link
              to={items[0].path}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">{items[0].label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Home className="h-4 w-4" />
              <span className="sr-only">{items[0].label}</span>
            </span>
          )}
        </>
      )}

      {/* Rest of the breadcrumb items */}
      {items.slice(1).map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {item.path ? (
            <Link
              to={item.path}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </motion.nav>
  );
}

// Alternative compact breadcrumb for mobile
export function CompactBreadcrumb({ items, className }: GuideBreadcrumbProps) {
  const currentItem = items[items.length - 1];
  const parentItem = items.length > 1 ? items[items.length - 2] : null;

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-2 text-sm', className)}
    >
      {parentItem && parentItem.path && (
        <>
          <Link
            to={parentItem.path}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span>Back to {parentItem.label}</span>
          </Link>
        </>
      )}
    </motion.nav>
  );
}