import Cubit from "../../lib/Cubit";

export default class CounterCubit extends Cubit<number> {
  constructor(cacheKey = "") {
    super(0, { persistKey: `count_${cacheKey}` });
    // this.onChange = (state) => {
    //   console.log(state);
    // };
  }

  increment = (): void => {
    this.emit(this.state + 1);
  };
  decrement = (): void => {
    this.emit(this.state - 1);
  };
}