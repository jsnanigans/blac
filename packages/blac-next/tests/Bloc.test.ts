import { describe, expect, it, vi } from 'vitest';
import { Bloc } from '../src';

enum Action {
  INCREMENT,
  DECREMENT,
}

class ExampleBloc extends Bloc<number, Action> {
  static create() {
    return new ExampleBloc(0);
  }

  reducer() {
    return 1;
  }
}

describe('Bloc', () => {
  describe('reducer', () => {
    it('should be called with the action and the state', () => {
      const state = Math.random();
      const bloc = new ExampleBloc(state);
      const spy = vi.spyOn(bloc, 'reducer');
      bloc.add(Action.INCREMENT);
      expect(spy).toHaveBeenCalledWith(Action.INCREMENT, state);
    });

    it('should update the state', () => {
      const rnd = Math.random();
      const bloc = new ExampleBloc(0);
      bloc.reducer = () => {
        return rnd;
      };
      bloc.add(Action.INCREMENT);
      expect(bloc.state).toBe(rnd);
    });
  });
});
