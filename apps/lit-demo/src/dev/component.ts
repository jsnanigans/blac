// Traced wrapper around @blac/lit's `component`: bumps devStats.bumpBody() on
// every render-body execution. Everything in the demo imports `component` from
// here (not from `@blac/lit`) so all component bodies get counted.
import { component as litComponent, type BlocView, type Ctx } from '@blac/lit';
import type { StateContainerConstructor, ExtractArgs } from '@blac/core';
import { devStats } from './devStats';

export type { Ctx };

export function component<T extends StateContainerConstructor>(
  Bloc: T,
  render: (bloc: BlocView<T>, ctx: Ctx<ExtractArgs<T>>) => unknown,
): ReturnType<typeof litComponent>;
export function component<A = unknown>(
  render: (ctx: Ctx<A>) => unknown,
): ReturnType<typeof litComponent>;
export function component(a: any, b?: any): any {
  if (typeof b === 'function') {
    return litComponent(a, (bloc: any, ctx: any) => {
      devStats.bumpBody();
      return b(bloc, ctx);
    });
  }
  return litComponent((ctx: any) => {
    devStats.bumpBody();
    return a(ctx);
  });
}
