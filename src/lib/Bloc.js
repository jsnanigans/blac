var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import BlocBase from "./BlocBase";
var Bloc = /** @class */ (function (_super) {
    __extends(Bloc, _super);
    function Bloc(initialState, options) {
        var _this = _super.call(this, initialState, options) || this;
        _this.onTransition = null;
        /**
         * @deprecated The method is deprecated. Use `on` to add your event handlers instead.
         */
        _this.mapEventToState = null;
        _this.eventHandlers = [];
        _this.add = function (event) {
            for (var _i = 0, _a = _this.eventHandlers; _i < _a.length; _i++) {
                var _b = _a[_i], eventName = _b[0], handler = _b[1];
                if (eventName === event) {
                    handler(event, _this.emit(event));
                    return;
                }
            }
            console.warn("Event is not handled in Bloc:", { event: event, bloc: _this });
        };
        _this.emit = function (event) { return function (newState) {
            _this.notifyChange(newState);
            _this.notifyTransition(newState, event);
            _this.next(newState);
            _this.notifyValueChange();
        }; };
        /**
         * Add a listener to the Bloc for when a new event is added. There can only be one handler for each event.
         * @param event The event that was added to the Bloc
         * @param handler A method that receives the event and a `emit` function that can be used to update the state
         */
        _this.on = function (event, handler) {
            _this.eventHandlers.push([event, handler]);
        };
        _this.notifyTransition = function (state, event) {
            var _a, _b;
            (_a = _this.consumer) === null || _a === void 0 ? void 0 : _a.notifyTransition(_this, state, event);
            (_b = _this.onTransition) === null || _b === void 0 ? void 0 : _b.call(_this, {
                currentState: _this.state,
                event: event,
                nextState: state,
            });
        };
        return _this;
    }
    return Bloc;
}(BlocBase));
export default Bloc;
