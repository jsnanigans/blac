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
import Bloc from "./Bloc";
import mockConsole from "jest-mock-console";
import { AuthEvent, TestBloc } from "../helpers/test.fixtures";
describe("Bloc", function () {
    var spy = {
        onChange: jest.fn(),
        onTransition: jest.fn()
    };
    beforeEach(function () {
        jest.resetAllMocks();
    });
    it("should add the public `add` method", function () {
        expect(new TestBloc()).toHaveProperty("add");
    });
    describe("add", function () {
        it("should log error if `mapEventToState` is not implemented", function () {
            mockConsole();
            var NotFullyImplemented = /** @class */ (function (_super) {
                __extends(NotFullyImplemented, _super);
                function NotFullyImplemented() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                return NotFullyImplemented;
            }(Bloc));
            var bloc = new NotFullyImplemented(false);
            expect(bloc.state).toBe(false);
            bloc.add(AuthEvent.authenticated);
            expect(console.warn).toHaveBeenCalledTimes(1);
        });
        it("should update the state", function () {
            var bloc = new TestBloc();
            expect(bloc.state).toBe(false);
            bloc.add(AuthEvent.authenticated);
            expect(bloc.state).toBe(true);
        });
        it("should call `onChange` before the state changes", function () {
            var bloc = new TestBloc();
            bloc.addChangeListener(spy.onChange);
            expect(spy.onChange).toHaveBeenCalledTimes(0);
            bloc.add(AuthEvent.authenticated);
            expect(spy.onChange).toHaveBeenCalledTimes(1);
            expect(spy.onChange.mock.calls[0][0]).toStrictEqual({
                currentState: false,
                nextState: true
            });
        });
        it("should call `onTransition` before the state changes with the event that was added", function () {
            var bloc = new TestBloc();
            bloc.onTransition = spy.onTransition;
            expect(spy.onTransition).toHaveBeenCalledTimes(0);
            bloc.add(AuthEvent.authenticated);
            expect(spy.onTransition).toHaveBeenCalledTimes(1);
            expect(spy.onTransition).toHaveBeenCalledWith({
                currentState: false,
                event: AuthEvent.authenticated,
                nextState: true
            });
        });
    });
});
