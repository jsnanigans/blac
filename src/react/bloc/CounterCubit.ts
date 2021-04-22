import Cubit from "../../lib/cubit";

export default class CounterCubit extends Cubit<number> {
  constructor(cacheKey = "") {
    super(0, { persistKey: `count_${cacheKey}` });
    this.onChange = (state) => {
      console.log(state);
    };
  }

  increment = (): void => {
    this.emit(this.state + 1);
  };
}
