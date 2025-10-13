/**
 * InteractionFeedback Component
 *
 * Celebration animations and feedback wrapper for user interactions.
 *
 * Features:
 * - Multiple animation types (confetti, sparkles, pulse, bounce)
 * - Trigger conditions (completion, interaction, correct-action)
 * - Respects prefers-reduced-motion
 * - Configurable intensity and duration
 * - Works with canvas-confetti library
 *
 * @example
 * ```tsx
 * <InteractionFeedback
 *   trigger="interaction"
 *   type="confetti"
 *   onTrigger={(count) => count % 10 === 0}
 * >
 *   <Button onClick={increment}>Increment</Button>
 * </InteractionFeedback>
 *
 * // Manual trigger
 * const { celebrate } = useInteractionFeedback();
 * <Button onClick={() => { doSomething(); celebrate('confetti'); }}>
 *   Do Something
 * </Button>
 * ```
 */

import React, { useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Animation type options
 */
export type FeedbackType = 'confetti' | 'sparkles' | 'pulse' | 'bounce' | 'glow';

/**
 * Trigger condition options
 */
export type FeedbackTrigger = 'completion' | 'interaction' | 'correct-action' | 'milestone';

/**
 * InteractionFeedback props
 */
export interface InteractionFeedbackProps {
  /** Animation type */
  type?: FeedbackType;

  /** Trigger condition */
  trigger?: FeedbackTrigger;

  /** Custom condition function (receives interaction data) */
  onTrigger?: (data?: any) => boolean;

  /** Animation intensity (0-1) */
  intensity?: number;

  /** Children to wrap */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;

  /** Disable all animations (respects prefers-reduced-motion) */
  disabled?: boolean;
}

/**
 * Confetti configuration presets
 */
const confettiPresets: Record<FeedbackTrigger, confetti.Options> = {
  completion: {
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981'],
  },
  interaction: {
    particleCount: 50,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#3b82f6', '#60a5fa'],
  },
  'correct-action': {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399'],
  },
  milestone: {
    particleCount: 200,
    spread: 120,
    origin: { y: 0.5 },
    colors: ['#f59e0b', '#fbbf24', '#fcd34d'],
  },
};

/**
 * Check if user prefers reduced motion
 */
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Celebration functions
 */
export const celebrations = {
  /**
   * Trigger confetti animation
   */
  confetti: (preset: FeedbackTrigger = 'interaction', customOptions?: confetti.Options) => {
    if (prefersReducedMotion()) return;

    const options = { ...confettiPresets[preset], ...customOptions };
    confetti(options);
  },

  /**
   * Trigger sparkles effect (lightweight confetti)
   */
  sparkles: () => {
    if (prefersReducedMotion()) return;

    confetti({
      particleCount: 30,
      spread: 40,
      startVelocity: 20,
      decay: 0.95,
      scalar: 0.8,
      origin: { y: 0.7 },
      colors: ['#fcd34d', '#fbbf24', '#f59e0b'],
    });
  },

  /**
   * Fireworks effect
   */
  fireworks: () => {
    if (prefersReducedMotion()) return;

    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#8b5cf6'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f97316', '#10b981'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  },

  /**
   * Burst effect from specific position
   */
  burst: (x: number = 0.5, y: number = 0.5) => {
    if (prefersReducedMotion()) return;

    confetti({
      particleCount: 100,
      spread: 360,
      origin: { x, y },
      colors: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981'],
    });
  },
};

/**
 * InteractionFeedback Component
 */
export const InteractionFeedback: React.FC<InteractionFeedbackProps> = ({
  type = 'confetti',
  trigger = 'interaction',
  onTrigger,
  intensity = 1,
  children,
  className,
  disabled = false,
}) => {
  const shouldAnimate = !disabled && !prefersReducedMotion();

  const triggerAnimation = useCallback(() => {
    if (!shouldAnimate) return;

    switch (type) {
      case 'confetti':
        celebrations.confetti(trigger, {
          particleCount: Math.floor(confettiPresets[trigger].particleCount! * intensity),
        });
        break;
      case 'sparkles':
        celebrations.sparkles();
        break;
      case 'pulse':
        // Handled by Framer Motion below
        break;
      case 'bounce':
        // Handled by Framer Motion below
        break;
      case 'glow':
        // Handled by Framer Motion below
        break;
    }
  }, [type, trigger, intensity, shouldAnimate]);

  // Framer Motion variants for non-confetti animations
  const motionVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.3 },
    },
    bounce: {
      y: [0, -10, 0],
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    glow: {
      boxShadow: [
        '0 0 0 rgba(59, 130, 246, 0)',
        '0 0 20px rgba(59, 130, 246, 0.5)',
        '0 0 0 rgba(59, 130, 246, 0)',
      ],
      transition: { duration: 0.6 },
    },
  };

  return (
    <motion.div
      className={cn('interaction-feedback', className)}
      animate={
        shouldAnimate && (type === 'pulse' || type === 'bounce' || type === 'glow')
          ? motionVariants[type]
          : {}
      }
    >
      {children}
    </motion.div>
  );
};

/**
 * Hook for manual feedback triggering
 */
export const useInteractionFeedback = () => {
  const celebrate = useCallback(
    (type: FeedbackType = 'confetti', trigger: FeedbackTrigger = 'interaction') => {
      if (prefersReducedMotion()) return;

      switch (type) {
        case 'confetti':
          celebrations.confetti(trigger);
          break;
        case 'sparkles':
          celebrations.sparkles();
          break;
        default:
          celebrations.confetti(trigger);
      }
    },
    []
  );

  return {
    celebrate,
    confetti: celebrations.confetti,
    sparkles: celebrations.sparkles,
    fireworks: celebrations.fireworks,
    burst: celebrations.burst,
  };
};

export default InteractionFeedback;
