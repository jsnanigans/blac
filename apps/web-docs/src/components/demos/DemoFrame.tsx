import type { ReactNode } from 'react';
import './demos.css';

export interface DemoFrameProps {
  /**
   * Optional uppercase label shown in the frame header (e.g. the demo name or
   * the claim it proves). Omit for a bare bordered body. A small "live" dot is
   * always rendered before the label to signal interactivity.
   */
  label?: ReactNode;
  /** The interactive demo itself. */
  children: ReactNode;
}

/**
 * Consistent, theme-synced chrome that wraps every interactive demo island so
 * they read uniformly against the docs' code snippets. Pure presentation — it
 * holds no blac state; the wrapped `children` own the live behavior.
 *
 * Usage (inside another island component, NOT directly in MDX — MDX mounts the
 * top-level island via `client:visible`):
 *
 *   <DemoFrame label="Counter">
 *     <CounterControls />
 *   </DemoFrame>
 *
 * See this directory's README for the full page-embedding contract.
 */
export function DemoFrame({ label, children }: DemoFrameProps) {
  return (
    <div className="blac-demo not-content">
      {label != null && <div className="blac-demo__label">{label}</div>}
      <div className="blac-demo__body">{children}</div>
    </div>
  );
}

export default DemoFrame;
