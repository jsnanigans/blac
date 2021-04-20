import Cubit from "../../lib/cubit";

export default class CounterCubit extends Cubit<number> {
    constructor() {
        super(0, {persistKey: 'count'});
        this.onChange = (state) => {
            console.log(state);
        }
    }

    increment = () => {
        this.emit(this.state + 1);
    }
}

export class LocalCounterCubit extends CounterCubit {}