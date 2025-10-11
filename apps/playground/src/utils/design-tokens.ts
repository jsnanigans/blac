/**
 * Design token utilities for BlaC Playground
 *
 * This module provides helper functions to access and use design tokens
 * defined in the Tailwind config. These utilities ensure consistent use
 * of colors throughout the playground demos.
 */

/**
 * BlaC concept types
 */
export type ConceptType = 'cubit' | 'bloc' | 'event';

/**
 * Lifecycle states
 */
export type LifecycleState =
  | 'active'
  | 'disposal'
  | 'disposing'
  | 'disposed'
  | 'ACTIVE'
  | 'DISPOSAL_REQUESTED'
  | 'DISPOSING'
  | 'DISPOSED';

/**
 * Instance patterns
 */
export type InstancePattern = 'shared' | 'isolated' | 'keepAlive';

/**
 * JavaScript value types for color coding
 */
export type ValueType = 'string' | 'number' | 'boolean' | 'object' | 'function';

/**
 * Semantic callout types
 */
export type SemanticType = 'tip' | 'warning' | 'success' | 'info' | 'danger';

/**
 * Color intensity levels
 */
export type ColorIntensity = 'light' | 'default' | 'dark';

/**
 * Get Tailwind color class for a BlaC concept
 *
 * @param concept - The concept type (cubit, bloc, event)
 * @param intensity - Color intensity (light, default, dark)
 * @returns Tailwind color class string
 */
export const getConceptColor = (
  concept: ConceptType,
  intensity: ColorIntensity = 'default'
): string => {
  const intensitySuffix = intensity === 'default' ? '' : `-${intensity}`;
  return `concept-${concept}${intensitySuffix}`;
};

/**
 * Get Tailwind background color class for a BlaC concept
 */
export const getConceptBg = (
  concept: ConceptType,
  intensity: ColorIntensity = 'default'
): string => {
  return `bg-${getConceptColor(concept, intensity)}`;
};

/**
 * Get Tailwind text color class for a BlaC concept
 */
export const getConceptText = (
  concept: ConceptType,
  intensity: ColorIntensity = 'default'
): string => {
  return `text-${getConceptColor(concept, intensity)}`;
};

/**
 * Get Tailwind border color class for a BlaC concept
 */
export const getConceptBorder = (
  concept: ConceptType,
  intensity: ColorIntensity = 'default'
): string => {
  return `border-${getConceptColor(concept, intensity)}`;
};

/**
 * Normalize lifecycle state strings
 */
const normalizeLifecycleState = (state: LifecycleState): string => {
  const stateMap: Record<string, string> = {
    ACTIVE: 'active',
    DISPOSAL_REQUESTED: 'disposal',
    DISPOSING: 'disposing',
    DISPOSED: 'disposed',
    active: 'active',
    disposal: 'disposal',
    disposing: 'disposing',
    disposed: 'disposed',
  };
  return stateMap[state] || 'active';
};

/**
 * Get Tailwind color class for a lifecycle state
 */
export const getLifecycleColor = (
  state: LifecycleState,
  intensity: ColorIntensity = 'default'
): string => {
  const normalized = normalizeLifecycleState(state);
  const intensitySuffix = intensity === 'default' ? '' : `-${intensity}`;
  return `lifecycle-${normalized}${intensitySuffix}`;
};

/**
 * Get Tailwind background color class for a lifecycle state
 */
export const getLifecycleBg = (
  state: LifecycleState,
  intensity: ColorIntensity = 'default'
): string => {
  return `bg-${getLifecycleColor(state, intensity)}`;
};

/**
 * Get Tailwind text color class for a lifecycle state
 */
export const getLifecycleText = (
  state: LifecycleState,
  intensity: ColorIntensity = 'default'
): string => {
  return `text-${getLifecycleColor(state, intensity)}`;
};

/**
 * Get Tailwind border color class for a lifecycle state
 */
export const getLifecycleBorder = (
  state: LifecycleState,
  intensity: ColorIntensity = 'default'
): string => {
  return `border-${getLifecycleColor(state, intensity)}`;
};

/**
 * Get Tailwind color class for an instance pattern
 */
export const getInstanceColor = (
  pattern: InstancePattern,
  intensity: ColorIntensity = 'default'
): string => {
  const intensitySuffix = intensity === 'default' ? '' : `-${intensity}`;
  return `instance-${pattern}${intensitySuffix}`;
};

/**
 * Get Tailwind background color class for an instance pattern
 */
export const getInstanceBg = (
  pattern: InstancePattern,
  intensity: ColorIntensity = 'default'
): string => {
  return `bg-${getInstanceColor(pattern, intensity)}`;
};

/**
 * Get Tailwind text color class for an instance pattern
 */
export const getInstanceText = (
  pattern: InstancePattern,
  intensity: ColorIntensity = 'default'
): string => {
  return `text-${getInstanceColor(pattern, intensity)}`;
};

/**
 * Get Tailwind border color class for an instance pattern
 */
export const getInstanceBorder = (
  pattern: InstancePattern,
  intensity: ColorIntensity = 'default'
): string => {
  return `border-${getInstanceColor(pattern, intensity)}`;
};

/**
 * Get the type of a JavaScript value
 */
const getValueType = (value: unknown): ValueType => {
  if (typeof value === 'function') return 'function';
  if (typeof value === 'object' && value !== null) return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
};

/**
 * Get Tailwind color class for a state value based on its type
 */
export const getTypeColor = (
  value: unknown,
  intensity: ColorIntensity = 'default'
): string => {
  const type = getValueType(value);
  const intensitySuffix = intensity === 'default' ? '' : `-${intensity}`;
  return `stateValue-${type}${intensitySuffix}`;
};

/**
 * Get Tailwind text color class for a state value based on its type
 */
export const getTypeText = (
  value: unknown,
  intensity: ColorIntensity = 'default'
): string => {
  return `text-${getTypeColor(value, intensity)}`;
};

/**
 * Get Tailwind background color class for a state value based on its type
 */
export const getTypeBg = (
  value: unknown,
  intensity: ColorIntensity = 'default'
): string => {
  return `bg-${getTypeColor(value, intensity)}`;
};

/**
 * Get Tailwind color class for a semantic type (callouts, alerts)
 */
export const getSemanticColor = (
  type: SemanticType,
  intensity: ColorIntensity = 'default'
): string => {
  const intensitySuffix = intensity === 'default' ? '' : `-${intensity}`;
  return `semantic-${type}${intensitySuffix}`;
};

/**
 * Get Tailwind background color class for a semantic type
 */
export const getSemanticBg = (
  type: SemanticType,
  intensity: ColorIntensity = 'default'
): string => {
  return `bg-${getSemanticColor(type, intensity)}`;
};

/**
 * Get Tailwind text color class for a semantic type
 */
export const getSemanticText = (
  type: SemanticType,
  intensity: ColorIntensity = 'default'
): string => {
  return `text-${getSemanticColor(type, intensity)}`;
};

/**
 * Get Tailwind border color class for a semantic type
 */
export const getSemanticBorder = (
  type: SemanticType,
  intensity: ColorIntensity = 'default'
): string => {
  return `border-${getSemanticColor(type, intensity)}`;
};

/**
 * Spacing utilities based on Tailwind spacing scale
 */
export const spacing = {
  xs: '0.5rem', // 8px
  sm: '0.75rem', // 12px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
};

/**
 * Typography scale
 */
export const typography = {
  xs: 'text-xs', // 12px
  sm: 'text-sm', // 14px
  base: 'text-base', // 16px
  lg: 'text-lg', // 18px
  xl: 'text-xl', // 20px
  '2xl': 'text-2xl', // 24px
  '3xl': 'text-3xl', // 30px
  '4xl': 'text-4xl', // 36px
};

/**
 * Breakpoint utilities
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * Check if current screen width matches a breakpoint
 */
export const matchesBreakpoint = (breakpoint: keyof typeof breakpoints): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(min-width: ${breakpoints[breakpoint]})`).matches;
};

/**
 * Get responsive value based on current breakpoint
 */
export const getResponsiveValue = <T>(values: {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T => {
  if (typeof window === 'undefined') return values.base;

  if (values['2xl'] && matchesBreakpoint('2xl')) return values['2xl'];
  if (values.xl && matchesBreakpoint('xl')) return values.xl;
  if (values.lg && matchesBreakpoint('lg')) return values.lg;
  if (values.md && matchesBreakpoint('md')) return values.md;
  if (values.sm && matchesBreakpoint('sm')) return values.sm;

  return values.base;
};

/**
 * Export all utilities as default
 */
export default {
  getConceptColor,
  getConceptBg,
  getConceptText,
  getConceptBorder,
  getLifecycleColor,
  getLifecycleBg,
  getLifecycleText,
  getLifecycleBorder,
  getInstanceColor,
  getInstanceBg,
  getInstanceText,
  getInstanceBorder,
  getTypeColor,
  getTypeText,
  getTypeBg,
  getSemanticColor,
  getSemanticBg,
  getSemanticText,
  getSemanticBorder,
  spacing,
  typography,
  breakpoints,
  matchesBreakpoint,
  getResponsiveValue,
};
