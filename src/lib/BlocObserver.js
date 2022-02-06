var BlocObserver = /** @class */ (function () {
    function BlocObserver(methods) {
        var _this = this;
        if (methods === void 0) { methods = {}; }
        // trigger events
        this.addChange = function (bloc, state) {
            _this.onChange(bloc, _this.createChangeEvent(bloc, state));
        };
        this.addTransition = function (bloc, state, event) {
            _this.onTransition(bloc, _this.createTransitionEvent(bloc, state, event));
        };
        this.addBlocAdded = function (bloc) {
            _this.onBlocAdded(bloc);
        };
        this.addBlocRemoved = function (bloc) {
            _this.onBlocRemoved(bloc);
        };
        // consume
        this.defaultAction = function () { };
        this.onBlocAdded = this.defaultAction;
        this.onBlocRemoved = this.defaultAction;
        this.onChange = methods.onChange ? methods.onChange : this.defaultAction;
        this.onTransition = methods.onTransition ? methods.onTransition : this.defaultAction;
    }
    BlocObserver.prototype.createTransitionEvent = function (bloc, state, event) {
        return {
            currentState: bloc.state,
            event: event,
            nextState: state,
        };
    };
    BlocObserver.prototype.createChangeEvent = function (bloc, state) {
        return {
            currentState: bloc.state,
            nextState: state,
        };
    };
    return BlocObserver;
}());
export default BlocObserver;
