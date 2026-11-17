import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { classHue, monogram } from './format';

const ICONS = {
  x: <path d="M18 6 6 18M6 6l12 12" />,
  pip: (
    <>
      <path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4" />
      <rect x="12" y="13" width="10" height="7" rx="2" />
    </>
  ),
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  arrowUp: <path d="m5 12 7-7 7 7M12 19V5" />,
  created: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </>
  ),
  disposed: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  ring: <circle cx="12" cy="12" r="4" />,
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 14,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={className ? `icon ${className}` : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

export const hueStyle = (className: string) =>
  ({ '--h': classHue(className) }) as CSSProperties;

/** A class's colored monogram; the hue also tints its group in the list. */
export const ClassMark = ({ className }: { className: string }) => (
  <span className="mark" aria-hidden style={hueStyle(className)}>
    {monogram(className)}
  </span>
);

export type Tone = 'danger' | 'warn' | 'success' | 'info' | 'muted';

/** An inline message with one optional action; errors are announced. */
export function Notice({
  tone,
  title,
  children,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="notice"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon name={tone === 'danger' ? 'disposed' : 'info'} size={16} />
      <div>
        <p className="notice-title">{title}</p>
        {children && <div className="notice-body">{children}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="kbd">{children}</kbd>
);

export function Segmented<T extends string>({
  label,
  options,
  value,
  render,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  render: (option: T) => ReactNode;
  onChange: (option: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {render(option)}
        </button>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="row skeleton-row">
          <span className="skeleton" style={{ width: 14, height: 14 }} />
          <span className="row-text">
            <span className="skeleton" style={{ width: `${60 - i * 6}%` }} />
            <span className="skeleton" style={{ width: '35%' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

const RELEASE_DELAY_MS = 500;

/**
 * Whether the pointer is over `element` or focus is inside it. Leaving releases
 * after a short delay, so crossing an edge doesn't flush updates under a click.
 */
export function useInteractionHold(element: HTMLElement | null): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hold = () => {
      clearTimeout(timer);
      setHeld(true);
    };
    const release = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!element.matches(':hover, :focus-within')) setHeld(false);
      }, RELEASE_DELAY_MS);
    };
    element.addEventListener('pointerenter', hold);
    element.addEventListener('pointerleave', release);
    element.addEventListener('focusin', hold);
    element.addEventListener('focusout', release);
    return () => {
      clearTimeout(timer);
      element.removeEventListener('pointerenter', hold);
      element.removeEventListener('pointerleave', release);
      element.removeEventListener('focusin', hold);
      element.removeEventListener('focusout', release);
    };
  }, [element]);
  return held;
}

/**
 * Shows `value` as it changes, except while `held`. A new value that
 * `passes(shown, value)` goes straight through, so harmless updates never hold.
 */
export function useHeldValue<T>(
  value: T,
  held: boolean,
  passes: (shown: T, value: T) => boolean = Object.is,
) {
  const [shown, setShown] = useState(value);
  const holding = held && !passes(shown, value);
  if (!holding && shown !== value) setShown(value);
  const release = useCallback(() => setShown(value), [value]);
  return { shown: holding ? shown : value, pending: holding, release };
}

/** Floats over a held list to offer the updates behind the hold. */
export function UpdatesPill({
  visible,
  label,
  onApply,
}: {
  visible: boolean;
  label: string;
  onApply: () => void;
}) {
  return (
    <div className="pill-anchor">
      <button
        type="button"
        className="pill"
        data-visible={visible}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={onApply}
      >
        <Icon name="arrowUp" size={12} />
        {label}
      </button>
    </div>
  );
}

let now = Date.now();
let ticker: ReturnType<typeof setInterval> | undefined;
const tickListeners = new Set<() => void>();

const subscribeNow = (listener: () => void) => {
  tickListeners.add(listener);
  ticker ??= setInterval(() => {
    now = Date.now();
    for (const l of tickListeners) l();
  }, 1000);
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size > 0) return;
    clearInterval(ticker);
    ticker = undefined;
  };
};

/** The time, ticking once a second while anything uses it. */
export const useNow = () =>
  useSyncExternalStore(
    subscribeNow,
    () => now,
    () => now,
  );

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

interface Bounds {
  initial: number;
  min: number;
  max: number;
}

const clampWidth = (width: number, { min, max }: Bounds) =>
  Math.round(Math.min(max, Math.max(min, width)));

/** A pane width remembered under `key`. */
export function useStoredWidth(key: string, bounds: Bounds) {
  const [width, setWidth] = useState(() => {
    const stored = Number(read(key));
    return stored ? clampWidth(stored, bounds) : bounds.initial;
  });
  useEffect(() => write(key, String(width)), [key, width]);
  return [width, (next: number) => setWidth(clampWidth(next, bounds))] as const;
}

/** Drag to resize; arrow keys nudge, double-click resets. */
export function ResizeHandle({
  width,
  onWidth,
  bounds,
  label,
}: {
  width: number;
  onWidth: (width: number) => void;
  bounds: Bounds;
  label: string;
}) {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.focus();
    const startX = event.clientX;
    const start = width;
    handle.setPointerCapture(event.pointerId);
    const move = (moved: globalThis.PointerEvent) =>
      onWidth(start + moved.clientX - startX);
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const by = { ArrowLeft: -16, ArrowRight: 16 }[event.key];
    if (!by) return;
    event.preventDefault();
    onWidth(width + by);
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      className="resize"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={bounds.min}
      aria-valuemax={bounds.max}
      title={`${label} (double-click to reset)`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onWidth(bounds.initial)}
    />
  );
}
