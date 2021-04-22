import Cubit from "../../lib/cubit";

export default class CounterCubit extends Cubit<number> {
    constructor(cacheKey: string = '') {
        super(0, {persistKey: `count_${cacheKey}`});
        this.onChange = (state) => {
            console.log(state);
        }
    }

    increment = () => {
        this.emit(this.state + 1);
    }
}