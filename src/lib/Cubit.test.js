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
import Cubit from "./Cubit";
describe("Cubit", function () {
    var spy = {
        onChange: jest.fn(),
    };
    var TestCubit = /** @class */ (function (_super) {
        __extends(TestCubit, _super);
        function TestCubit() {
            var _this = _super.call(this, 0) || this;
            _this.increment = function () { return _this.emit(_this.state + 1); };
            _this.addChangeListener(spy.onChange);
            return _this;
        }
        return TestCubit;
    }(Cubit));
    beforeEach(function () {
        jest.resetAllMocks();
    });
    it("should add the protected `emit` method", function () {
        expect(new TestCubit()).toHaveProperty("emit");
    });
    describe("emit", function () {
        it("should update the state when emit is called", function () {
            var cubit = new TestCubit();
            expect(cubit.state).toBe(0);
            cubit.increment();
            expect(cubit.state).toBe(1);
        });
        it("should call `onChange` before the state changes", function () {
            var cubit = new TestCubit();
            expect(spy.onChange).toHaveBeenCalledTimes(0);
            cubit.increment();
            expect(spy.onChange.mock.calls[0][0]).toStrictEqual({
                currentState: 0,
                nextState: 1,
            });
        });
    });
});
