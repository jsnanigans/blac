import { describe, expect, it } from 'vitest';
import { Cubit } from './Cubit';

class ExampleCubit extends Cubit<number> {}

describe('Cubit', () => {
  describe('emit', () => {
    it('should update the state', () => {
      const cubit = new ExampleCubit(0);
      cubit.emit(1);
      expect(cubit.state).toBe(1);
    });

    it('should not notify observers if state is the same', () => {
      const cubit = new ExampleCubit(0);
      cubit.emit(0);
      expect(cubit.state).toBe(0);
    });
  });
});
