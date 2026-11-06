import { useLayoutEffect, useRef } from 'react';
import { blac, Cubit, ensure } from '@blac/core';
import { light } from '../scripts/light';

export { light };

const KEY = 'blac-render-flash';

/**
 * Site-wide UI state, shared by every island on the page through the blac
 * registry: the header switch writes it, every demo component reads it.
 */
export class SiteCubit extends Cubit<{ flash: boolean }> {
  constructor() {
    let flash = false;
    try {
      flash = localStorage.getItem(KEY) === '1';
    } catch {
      // Storage blocked: fall back to the default.
    }
    super({ flash });
  }

  toggleFlash = () => {
    const flash = !this.state.flash;
    this.patch({ flash });
    try {
      localStorage.setItem(KEY, flash ? '1' : '0');
    } catch {
      // Storage blocked: fall back to the default.
    }
  };
}

blac({ keepAlive: true })(SiteCubit);

/**
 * After every re-render (not the first), light `target(el)` in amber while
 * "Show renders" is on. Reads the flag with `ensure`, outside render, so the
 * switch itself never re-renders the component it is watching.
 */
export function useRenderFlash<T extends HTMLElement>(
  target: (el: T) => Element | null = (el) => el,
) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (ref.current && ensure(SiteCubit).state.flash)
      light(target(ref.current));
  });
  return ref;
}
