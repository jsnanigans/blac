/**
 * Shared animation utilities for BlaC Playground demos
 *
 * This module provides:
 * - Framer Motion variants for common animations
 * - Celebration animation triggers
 * - Scroll animation helpers
 * - Reduced motion support
 */

import type { Variants, Transition } from 'framer-motion';
import confetti from 'canvas-confetti';

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Common transition configurations
 */
export const transitions = {
  fast: { duration: 0.2, ease: 'easeOut' } as Transition,
  normal: { duration: 0.3, ease: 'easeInOut' } as Transition,
  slow: { duration: 0.5, ease: 'easeInOut' } as Transition,
  spring: { type: 'spring', stiffness: 300, damping: 30 } as Transition,
  bouncy: { type: 'spring', stiffness: 400, damping: 10 } as Transition,
};

/**
 * Framer Motion animation variants
 */
export const variants = {
  /**
   * Fade in animation
   */
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: transitions.normal,
    },
  } as Variants,

  /**
   * Slide up from bottom with fade
   */
  slideUp: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: transitions.normal,
    },
  } as Variants,

  /**
   * Slide in from bottom (larger movement)
   */
  slideInFromBottom: {
    hidden: { y: 40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: transitions.spring,
    },
  } as Variants,

  /**
   * Scale in animation (grow from center)
   */
  scaleIn: {
    hidden: { scale: 0.9, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: transitions.spring,
    },
  } as Variants,

  /**
   * Stagger children animations
   */
  staggerChildren: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  } as Variants,

  /**
   * Pulse animation for state changes
   */
  pulse: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.3,
        times: [0, 0.5, 1],
      },
    },
  } as Variants,

  /**
   * Slide in from left
   */
  slideInFromLeft: {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: transitions.normal,
    },
  } as Variants,

  /**
   * Slide in from right
   */
  slideInFromRight: {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: transitions.normal,
    },
  } as Variants,
};

/**
 * Celebration animation types
 */
export type CelebrationType = 'completion' | 'interaction' | 'correct-action';
export type AnimationType = 'confetti' | 'sparkles' | 'pulse' | 'bounce';

/**
 * Celebration animation configurations
 */
const celebrationConfigs = {
  completion: {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#a855f7', '#22c55e', '#eab308', '#f97316'],
  },
  interaction: {
    particleCount: 50,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#3b82f6', '#a855f7'],
  },
  'correct-action': {
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#86efac'],
  },
};

/**
 * Trigger celebration animation
 *
 * @param type - Type of celebration
 * @param customOrigin - Optional custom origin point
 */
export const celebrate = (
  type: CelebrationType = 'interaction',
  customOrigin?: { x?: number; y?: number }
) => {
  // Respect reduced motion preference
  if (prefersReducedMotion()) return;

  const config = celebrationConfigs[type];

  confetti({
    ...config,
    origin: customOrigin || config.origin,
  });
};

/**
 * Trigger celebration from a specific element
 *
 * @param element - HTML element to celebrate from
 * @param type - Type of celebration
 */
export const celebrateFromElement = (
  element: HTMLElement,
  type: CelebrationType = 'interaction'
) => {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  celebrate(type, { x, y });
};

/**
 * Trigger sparkles animation (smaller, faster confetti)
 *
 * @param origin - Origin point
 */
export const sparkles = (origin?: { x?: number; y?: number }) => {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 30,
    spread: 40,
    origin: origin || { y: 0.7 },
    startVelocity: 20,
    decay: 0.9,
    scalar: 0.6,
    colors: ['#fde047', '#fbbf24', '#f59e0b'],
  });
};

/**
 * Scroll-based animation helpers
 */
export const scroll = {
  /**
   * Create a scroll-triggered fade in animation
   */
  fadeInOnScroll: (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { ...transitions.normal, delay },
  }),

  /**
   * Create a scroll-triggered scale animation
   */
  scaleOnScroll: (delay = 0) => ({
    initial: { opacity: 0, scale: 0.9 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: '-50px' },
    transition: { ...transitions.spring, delay },
  }),

  /**
   * Create a staggered children animation on scroll
   */
  staggerOnScroll: (staggerDelay = 0.1) => ({
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, margin: '-50px' },
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    },
  }),
};

/**
 * Create a conditional animation that respects reduced motion
 *
 * @param animation - Animation configuration
 * @returns Animation config or null if reduced motion is enabled
 */
export const withReducedMotion = <T>(animation: T): T | null => {
  return prefersReducedMotion() ? null : animation;
};

/**
 * Utility to get transition duration based on reduced motion preference
 *
 * @param normalDuration - Normal duration in seconds
 * @param reducedDuration - Duration when reduced motion is enabled
 * @returns Duration value
 */
export const getTransitionDuration = (
  normalDuration: number,
  reducedDuration: number = 0.01
): number => {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
};

/**
 * Pre-configured animation combinations for common use cases
 */
export const presets = {
  /**
   * Card entrance animation
   */
  cardEntrance: {
    initial: 'hidden',
    animate: 'visible',
    variants: variants.slideUp,
  },

  /**
   * Section reveal animation
   */
  sectionReveal: {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, margin: '-100px' },
    variants: variants.fadeIn,
  },

  /**
   * Interactive element hover animation
   */
  interactiveHover: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: transitions.fast,
  },

  /**
   * Button press animation
   */
  buttonPress: {
    whileTap: { scale: 0.95 },
    transition: transitions.fast,
  },

  /**
   * State change pulse
   */
  statePulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.3,
        times: [0, 0.5, 1],
      },
    },
  },
};

/**
 * Export all as default for convenience
 */
export default {
  variants,
  transitions,
  celebrate,
  celebrateFromElement,
  sparkles,
  scroll,
  presets,
  withReducedMotion,
  getTransitionDuration,
  prefersReducedMotion,
};
