import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { GuideNavigation as GuideNavigationType } from './types';

interface GuideNavigationProps {
  navigation: GuideNavigationType | null;
  className?: string;
}

export function GuideNavigation({ navigation, className }: GuideNavigationProps) {
  if (!navigation) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t',
        className
      )}
    >
      {/* Previous Button */}
      <div className="w-full sm:w-auto">
        {navigation.previous ? (
          <Link
            to={navigation.previous.path}
            className="group flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent/10 transition-all hover:shadow-md w-full sm:w-auto"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="text-left flex-1">
              <div className="text-xs text-muted-foreground mb-1">Previous</div>
              <div className="text-sm font-medium group-hover:text-accent-foreground transition-colors">
                {navigation.previous.title}
              </div>
            </div>
          </Link>
        ) : (
          <div className="w-full sm:w-48" /> // Spacer to maintain alignment
        )}
      </div>

      {/* Progress Indicator (optional) */}
      <div className="hidden sm:flex items-center gap-2">
        <ProgressIndicator navigation={navigation} />
      </div>

      {/* Next Button */}
      <div className="w-full sm:w-auto">
        {navigation.next ? (
          <Link
            to={navigation.next.path}
            className="group flex items-center gap-2 px-4 py-3 rounded-lg border bg-card hover:bg-accent/10 transition-all hover:shadow-md w-full sm:w-auto justify-end"
          >
            <div className="text-right flex-1">
              <div className="text-xs text-muted-foreground mb-1">Next</div>
              <div className="text-sm font-medium group-hover:text-accent-foreground transition-colors">
                {navigation.next.title}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ) : (
          <Link
            to="/guide"
            className="group flex items-center gap-2 px-4 py-3 rounded-lg border bg-gradient-to-r from-accent/10 to-accent/20 hover:from-accent/20 hover:to-accent/30 transition-all hover:shadow-md w-full sm:w-auto justify-center"
          >
            <div className="text-center">
              <div className="text-sm font-medium">
                Complete! Return to Guide
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        )}
      </div>
    </motion.nav>
  );
}

// Optional progress indicator component
function ProgressIndicator({ navigation }: { navigation: GuideNavigationType }) {
  // This could be enhanced to show actual progress through the guide
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      <div className="h-2 w-2 rounded-full bg-accent" />
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
    </div>
  );
}