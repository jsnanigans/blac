import { BlocObserver } from "../../src/lib";
import { blocState } from "./state/state";


class Observer extends BlocObserver {
  constructor() {
    super();
    this.onBlocAdded = (e) => {
      blocState.add(e);
    };
    this.onBlocRemoved = (e) => {
      blocState.remove(e) ;
    };
    this.onChange = (e) => {
      blocState.update(e) ;
    };
  }
}

export default Observer;
