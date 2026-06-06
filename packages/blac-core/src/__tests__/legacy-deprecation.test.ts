// NOTE: This file is M5-disposable.
// M5 will delete this file along with the legacy deprecated surface on StateContainer.
// Until then, it pins two invariants that must hold for all Wave-2 work:
//   1. Legacy getters still return correct values (delegates work).
//   2. The deprecation warn helper does NOT fire under NODE_ENV === 'test'
//      (vitest sets NODE_ENV=test), so test suites that spy on console.warn
//      are not polluted.

import { describe, it, expect, vi } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { StateContainer } from '../core/StateContainer';
import { INIT_CONFIG } from '../core/symbols';

class PinBloc extends StateContainer<{ v: number }> {
  constructor() {
    super({ v: 0 });
  }
}

describe('legacy deprecated surface — M5-disposable pin', () => {
  blacTestSetup();

  describe('legacy getters return correct values', () => {
    it('legacy .name returns same value as $blac.name', () => {
      const bloc = new PinBloc();
      bloc[INIT_CONFIG]({ name: 'PinName', instanceId: 'pin-id', debug: true });

      expect(bloc.name).toBe(bloc.$blac.name);
      expect(bloc.name).toBe('PinName');
    });

    it('legacy .instanceId returns same value as $blac.id', () => {
      const bloc = new PinBloc();
      bloc[INIT_CONFIG]({ instanceId: 'pin-id' });

      expect(bloc.instanceId).toBe(bloc.$blac.id);
    });

    it('legacy .debug returns same value as $blac.debug', () => {
      const bloc = new PinBloc();
      bloc[INIT_CONFIG]({ debug: true });

      expect(bloc.debug).toBe(bloc.$blac.debug);
      expect(bloc.debug).toBe(true);
    });

    it('legacy .createdAt returns same value as $blac.createdAt', () => {
      const bloc = new PinBloc();
      expect(bloc.createdAt).toBe(bloc.$blac.createdAt);
      expect(typeof bloc.createdAt).toBe('number');
    });

    it('legacy .isDisposed returns same value as $blac.disposed', () => {
      const bloc = new PinBloc();
      expect(bloc.isDisposed).toBe(bloc.$blac.disposed);
      expect(bloc.isDisposed).toBe(false);
      bloc.dispose();
      expect(bloc.isDisposed).toBe(bloc.$blac.disposed);
      expect(bloc.isDisposed).toBe(true);
    });

    it('legacy .hydrationStatus returns same value as $blac.hydration.status', () => {
      const bloc = new PinBloc();
      expect(bloc.hydrationStatus).toBe(bloc.$blac.hydration.status);
      bloc.$blac.hydration.begin();
      expect(bloc.hydrationStatus).toBe(bloc.$blac.hydration.status);
      expect(bloc.hydrationStatus).toBe('hydrating');
    });
  });

  describe('deprecation warn does NOT fire under NODE_ENV === "test"', () => {
    it('reading legacy getters does not trigger console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const bloc = new PinBloc();
      bloc[INIT_CONFIG]({ name: 'WarnCheck' });

      // Access every legacy getter
      void bloc.name;
      void bloc.debug;
      void bloc.instanceId;
      void bloc.createdAt;
      void bloc.isDisposed;
      void bloc.hydrationStatus;

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
