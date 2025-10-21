import { LucideIcon } from 'lucide-react';
import type { DemoCategory } from '@/core/utils/demoRegistry';

export interface GuideDemo {
  id: string;
  title: string;
  sequence: number;
  completed?: boolean;
}

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: DemoCategory;
  demos: string[]; // Array of demo IDs
  color: string; // Tailwind color class for the section
}

export interface GuideStructure {
  sections: GuideSection[];
}

export interface NavigationItem {
  sectionId: string;
  demoId: string;
  title: string;
  path: string;
}

export interface GuideNavigation {
  previous?: NavigationItem;
  current: NavigationItem;
  next?: NavigationItem;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
