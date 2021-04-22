import BlocBase, {BlocOptions} from "./blocBase";

export default class Bloc<E, T> extends BlocBase<T> {
    mapEventToState: (event: E) => T;
    onTransition: null | ((change: { currentState: T, event: E, nextState: T }) => void) = null;

    constructor(initialState: T, options?: BlocOptions) {
        super(initialState, options);
        this.mapEventToState = () => initialState;
    }

    public add = (event: E) => {
        const newState = this.mapEventToState(event);
        this.notifyChange(newState);
        this.notifyTransition(newState, event);
        this.subject.next(newState);
        this.updateCache();
    }

    protected notifyTransition = (value: T, event: E) => {
        this.onTransition?.({
            currentState: this._subject.getValue(),
            event,
            nextState: value,
        })
    }
}