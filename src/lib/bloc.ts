import Cubit, {CubitOptions} from "./cubit";

export default class Bloc<E, T> extends Cubit<T> {
    mapEventToState: (event: E) => T;
    onTransition: null | ((change: { currentState: T, event: E, nextState: T }) => void) = null;

    constructor(initialState: T, options?: CubitOptions) {
        super(initialState, options);
        this.emit = () => console.warn('`.emit` is disabled for Bloc`s, instead use `mapEventToState` and `.add`')
        this.mapEventToState = () => initialState;
    }

    add = (event: E) => {
        const newState = this.mapEventToState(event);
        this.notifyChange(newState);
        this.notifyTransition(newState, event);
        this.subject.next(newState);
        this.updateCache();
    }

    protected notifyTransition(value: T, event: E) {
        this.onTransition?.({
            currentState: this._subject.getValue(),
            event,
            nextState: value,
        })
    }
}