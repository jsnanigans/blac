import { useEffect, useRef, useState } from 'react';

/**
 * The id of the active beat in the `<blac-scrolly>` around this island, or
 * `fallback` until a scrolly reports one (and when used outside a chapter).
 */
export function useBeat<T extends HTMLElement>(fallback: string) {
  const ref = useRef<T>(null);
  const [beat, setBeat] = useState(fallback);

  useEffect(() => {
    const scrolly = ref.current?.closest<
      HTMLElement & { active: string | null }
    >('blac-scrolly');
    if (!scrolly) return;
    if (scrolly.active) setBeat(scrolly.active);
    const onBeat = (e: Event) => setBeat((e as CustomEvent<string>).detail);
    scrolly.addEventListener('beat', onBeat);
    return () => scrolly.removeEventListener('beat', onBeat);
  }, []);

  return [beat, ref] as const;
}
