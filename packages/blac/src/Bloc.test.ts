import { describe, expect, it, vi } from 'vitest';
import { Bloc } from './Bloc';
import { Blac } from './Blac';

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
  it('blac should call create if its defined', () => {
    const spy = vi.spyOn(ExampleBloc, 'create');
    Blac.getInstance().getBloc(ExampleBloc);
    expect(spy).toHaveBeenCalled();
  });

  describe('reducer', () => {
    it('should be called with the action and the state', () => {
      const state = Math.random();
      const bloc = new ExampleBloc(state);
      const spy = vi.spyOn(bloc, 'reducer');
      bloc.emit(Action.INCREMENT);
      expect(spy).toHaveBeenCalledWith(Action.INCREMENT, state);
    });

    it('should update the state', () => {
      const rnd = Math.random();
      const bloc = new ExampleBloc(0);
      bloc.reducer = () => {
        return rnd;
      };
      bloc.emit(Action.INCREMENT);
      expect(bloc.state).toBe(rnd);
    });
  });
});
