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
import { BlocConsumer } from "./BlocConsumer";
describe("BlocBase", function () {
    var TestBloc = /** @class */ (function (_super) {
        __extends(TestBloc, _super);
        function TestBloc() {
            return _super.call(this, false) || this;
        }
        return TestBloc;
    }(BlocBase));
    it("should have a `set consumer` method", function () {
        expect(new TestBloc()).toHaveProperty("consumer");
    });
    it("should allow setting the consumer", function () {
        var bloc = new TestBloc();
        try {
            bloc.consumer = new BlocConsumer([]);
        }
        catch (e) {
            fail(e);
        }
    });
    describe("Register Listener", function () {
        it("should add and remove `Register Listener`", function () {
            var stream = new BlocBase('');
            var method = jest.fn();
            var remove = stream.addRegisterListener(method);
            expect(stream.registerListeners).toHaveLength(1);
            remove();
            expect(stream.registerListeners).toHaveLength(0);
        });
    });
    describe("Change Listener", function () {
        it("should add and remove `Change Listener`", function () {
            var stream = new BlocBase('');
            var method = jest.fn();
            var remove = stream.addChangeListener(method);
            expect(stream.changeListeners).toHaveLength(1);
            remove();
            expect(stream.changeListeners).toHaveLength(0);
        });
    });
    describe("Value Change Listener", function () {
        it("should add and remove `Value Change Listener`", function () {
            var stream = new BlocBase('');
            var method = jest.fn();
            var remove = stream.addValueChangeListener(method);
            expect(stream.valueChangeListeners).toHaveLength(1);
            remove();
            expect(stream.valueChangeListeners).toHaveLength(0);
        });
    });
    describe("notifyChange", function () {
        it("should call change listeners", function () {
            var stream = new BlocBase('');
            var method = jest.fn();
            stream.addChangeListener(method);
            stream.notifyChange('');
            expect(method).toHaveBeenCalledTimes(1);
        });
    });
    describe("notifyValueChange", function () {
        it("should call change listeners", function () {
            var stream = new BlocBase('');
            var method = jest.fn();
            stream.addValueChangeListener(method);
            stream.notifyValueChange();
            expect(method).toHaveBeenCalledTimes(1);
        });
    });
});
