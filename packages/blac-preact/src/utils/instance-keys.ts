/**
 * Instance key generation utilities for Preact integration
 */

import { generateIsolatedKey } from '@blac/core';
import type { ComponentRef } from '../types';

/**
 * Generate an instance key for a bloc
 *
 * Logic:
 * - If user provides instanceId, use it (convert number to string)
 * - If isolated, generate or reuse a unique key for this component
 * - Otherwise, return undefined (use default key)
 *
 * @param componentRef - Preact component reference (persists across remounts)
 * @param isIsolated - Whether the bloc is isolated
 * @param providedId - User-provided instance ID (from options)
 * @returns Instance key string or undefined for default
 */
export function generateInstanceKey(
  componentRef: ComponentRef,
  isIsolated: boolean,
  providedId?: string | number,
): string | undefined {
  // User explicitly provided an ID - use it
  if (providedId !== undefined) {
    return typeof providedId === 'number' ? String(providedId) : providedId;
  }

  // Isolated bloc - generate unique key per component
  if (isIsolated) {
    if (!componentRef.__blocInstanceId) {
      componentRef.__blocInstanceId = generateIsolatedKey();
    }
    return componentRef.__blocInstanceId;
  }

  // Shared bloc - use default key (undefined)
  return undefined;
}
