import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function for constructing class names with conditional logic
 * that also merges Tailwind CSS classes properly.
 * 
 * This combines clsx for conditional class joining with tailwind-merge
 * to properly handle Tailwind utility conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
