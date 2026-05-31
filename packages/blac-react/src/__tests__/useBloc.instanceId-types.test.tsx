/**
 * Type-acceptance tests for the args option on useBloc.
 *
 * Replaces the old instanceId type tests now that instanceId is removed.
 * Runtime behaviour is covered by useBloc.args.test.tsx; this file focuses
 * on compile-time type acceptance and the args-forwarding runtime contract.
 */

import { describe, it, expect } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

blacTestSetup();

// Bloc with required args
class TaggedBloc extends Cubit<{ tag: string }, { tag: string }> {
  constructor() {
    super({ tag: '' });
  }
  protected init(a: { tag: string }) {
    this.emit({ tag: a.tag });
  }
}

// Void-args bloc
class PlainBloc extends Cubit<{ value: number }> {
  constructor() {
    super({ value: 0 });
  }
}

describe('useBloc args type-acceptance', () => {
  it('accepts args matching the bloc Args type', () => {
    function TestComponent() {
      const [state] = useBloc(TaggedBloc, { args: { tag: 'hello' } });
      return <div>Tag: {state.tag}</div>;
    }
    render(<TestComponent />);
    expect(screen.getByText('Tag: hello')).toBeDefined();
  });

  it('void-args bloc can be called without options', () => {
    function TestComponent() {
      const [state] = useBloc(PlainBloc);
      return <div>Value: {state.value}</div>;
    }
    render(<TestComponent />);
    expect(screen.getByText('Value: 0')).toBeDefined();
  });

  it('void-args bloc can be called with select/onMount/onUnmount but no args', () => {
    function TestComponent() {
      const [state] = useBloc(PlainBloc, {
        select: (s) => [s.value],
        onMount: () => {},
        onUnmount: () => {},
      });
      return <div>Value: {state.value}</div>;
    }
    render(<TestComponent />);
    expect(screen.getByText('Value: 0')).toBeDefined();
  });

  it('two components with different args get different instances', () => {
    let instanceA: TaggedBloc | null = null;
    let instanceB: TaggedBloc | null = null;

    function CompA() {
      const [, bloc] = useBloc(TaggedBloc, { args: { tag: 'alpha' } });
      instanceA = bloc as TaggedBloc;
      return null;
    }
    function CompB() {
      const [, bloc] = useBloc(TaggedBloc, { args: { tag: 'beta' } });
      instanceB = bloc as TaggedBloc;
      return null;
    }

    render(
      <>
        <CompA />
        <CompB />
      </>,
    );

    expect(instanceA).not.toBeNull();
    expect(instanceB).not.toBeNull();
    expect(instanceA).not.toBe(instanceB);
  });
});

// ---------------------------------------------------------------------------
// Compile-time type tests (verified by typecheck / tsc --noEmit)
// ---------------------------------------------------------------------------

import type { UseBlocOptions } from '../types';

// For an args-bloc, omitting args is valid (provider may supply them at runtime).
const _missingArgs: UseBlocOptions<typeof TaggedBloc> = {};
void _missingArgs;

// args field wrong type.
// @ts-expect-error — wrong args field type (number not assignable to string)
const _wrongType: UseBlocOptions<typeof TaggedBloc> = { args: { tag: 42 } };
void _wrongType;

// instanceId is gone — passing it is a TS error.
// @ts-expect-error — instanceId does not exist on UseBlocOptions
const _noInstanceId: UseBlocOptions<typeof PlainBloc> = { instanceId: 'x' };
void _noInstanceId;
