import { render as litRender, nothing } from 'lit-html';

export interface MountHandle {
  unmount(): void;
}

/** Render a blac-lit renderable into a container. Returns an unmount handle. */
export function mount(
  value: unknown,
  container: HTMLElement | DocumentFragment,
): MountHandle {
  const part = litRender(value, container);
  return {
    unmount() {
      part.setConnected(false);
      litRender(nothing, container);
    },
  };
}
