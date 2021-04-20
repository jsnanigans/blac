import Cubit from "../../lib/cubit";

export default class CounterCubit extends Cubit<number> {
    constructor() {
        super(0);
        this.onChange = (state) => {
            console.log(state);
        }
    }

    increment = () => {
        this.emit(this.state + 1);
    }
}