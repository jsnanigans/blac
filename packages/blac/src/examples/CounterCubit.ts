import { Cubit, CubitOptions } from "../Cubit";

export type CounterState = number;

export class CounterCubit extends Cubit<CounterState> {
  constructor(options: CubitOptions = {}) {
    super(0, options);
  }

  increment() {
    this.emit(this.state + 1);
  }
}
