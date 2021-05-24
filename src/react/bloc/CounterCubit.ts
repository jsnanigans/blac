import Cubit from "../../lib/Cubit";

export default class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = (): void => {
    this.emit(this.state + 1);
  };
  decrement = (): void => {
    this.emit(this.state - 1);
  };
}

export class CounterCubitTimer extends Cubit<number> {
  constructor(t: number = 1000) {
    super(0);
    const i = setInterval(() => {
      this.increment();
    }, t);

    this.addRemoveListener(() => clearInterval(i));
  }

  increment = (): void => {
    this.emit(this.state + 1);
  };
}
