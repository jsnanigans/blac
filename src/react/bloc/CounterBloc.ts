import Cubit from "../../lib/cubit";

export default class CounterBloc extends Cubit<number> {
    constructor() {
        super(0);
    }

    increment = () => {
        this.emit(this.state + 1);
    }
}