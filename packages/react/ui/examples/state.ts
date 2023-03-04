import { Blac, Cubit } from "blac";

// Create a new Cubit, this should ideally be in a separate file
export class CounterGlobalCubit extends Cubit<number> {
  increment = () => {
    this.emit(this.state + 1);
  };
  decrement = () => {
    this.emit(this.state - 1);
  };
}
export const globalCounterGlobalState = new CounterGlobalCubit(0);

// Create a new instance of Blac
export const blac = new Blac({
  global: {
    counter: globalCounterGlobalState,
  }
});
