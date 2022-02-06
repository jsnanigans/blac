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
import mockConsole from "jest-mock-console";
import { LOCAL_STORAGE_PREFIX } from "./constants";
import StreamAbstraction from "./StreamAbstraction";
describe("StreamAbstraction", function () {
    var StreamAbstractionExposed = /** @class */ (function (_super) {
        __extends(StreamAbstractionExposed, _super);
        function StreamAbstractionExposed(initialValue, blocOptions) {
            if (blocOptions === void 0) { blocOptions = {}; }
            return _super.call(this, initialValue, blocOptions) || this;
        }
        StreamAbstractionExposed.prototype.next_exposed = function (value) {
            this.next(value);
        };
        return StreamAbstractionExposed;
    }(StreamAbstraction));
    var persistKey = "storeKey";
    var initValue = 42;
    var cachedValue = 100;
    describe("constructor", function () {
        it("should set initial value", function () {
            var bloc = new StreamAbstraction(42);
            expect(bloc.state).toBe(42);
        });
        describe("Options", function () {
            beforeEach(function () {
                localStorage.setItem(LOCAL_STORAGE_PREFIX + persistKey, "{\"state\": ".concat(cachedValue, "}"));
            });
            it("should get value from localStorage if the key is defined", function () {
                var stream = new StreamAbstraction(initValue, { persistKey: persistKey });
                expect(stream.state).toBe(cachedValue);
            });
            it("should use default value if localStorage key is not defined", function () {
                localStorage.removeItem(LOCAL_STORAGE_PREFIX + persistKey);
                var stream = new StreamAbstraction(initValue, { persistKey: persistKey });
                expect(stream.state).toBe(initValue);
            });
            it("should not get value from localStorage if `persistKey` is not defined", function () {
                var stream = new StreamAbstraction(initValue, {});
                expect(stream.state).toBe(initValue);
            });
            it("should not get value from localStorage if `persistData` is false", function () {
                var stream = new StreamAbstraction(initValue, {
                    persistKey: persistKey,
                    persistData: false,
                });
                expect(stream.state).toBe(initValue);
            });
            it("should handle invalid json in localstorage for the key", function () {
                mockConsole();
                localStorage.setItem(LOCAL_STORAGE_PREFIX + persistKey, "invalid json here: state\": ".concat(cachedValue));
                var stream = new StreamAbstraction(initValue, { persistKey: persistKey });
                expect(stream.state).toBe(initValue);
                expect(console.error).toHaveBeenCalledTimes(1);
            });
        });
        describe("Remove Listener", function () {
            it("should add and remove `Remove Listener`", function () {
                var stream = new StreamAbstraction('');
                var method = jest.fn();
                var remove = stream.addRemoveListener(method);
                expect(stream.removeListeners).toHaveLength(1);
                remove();
                expect(stream.removeListeners).toHaveLength(0);
            });
        });
        describe("Stream Methods", function () {
            var spy = {
                next: jest.fn(),
            };
            beforeEach(function () {
                jest.resetAllMocks();
            });
            it("should expose a method `subscribe` to listen for changes", function () {
                var stream = new StreamAbstractionExposed(0);
                stream.subscribe({ next: spy.next });
                expect(spy.next).toHaveBeenCalledTimes(1);
                stream.next_exposed(2);
                expect(spy.next).toHaveBeenCalledTimes(2);
            });
            it("should not update stream after `complete` is called", function () {
                var stream = new StreamAbstractionExposed(0);
                stream.subscribe({ next: spy.next });
                expect(spy.next).toHaveBeenCalledTimes(1);
                stream.complete();
                expect(stream.isClosed).toBe(true);
                stream.next_exposed(2);
                expect(spy.next).toHaveBeenCalledTimes(1);
            });
        });
    });
    describe("Persist Data Methods", function () {
        beforeEach(function () {
            jest.resetAllMocks();
        });
        it("should clear the data from localstorage when `clearCache` is called", function () {
            var stream = new StreamAbstractionExposed(initValue, { persistKey: persistKey });
            stream.clearCache();
            expect(localStorage.removeItem).toHaveBeenCalledWith(LOCAL_STORAGE_PREFIX + persistKey);
        });
        it("should not do anything if there is no `persistKey` when `clearCache` is called", function () {
            var stream = new StreamAbstractionExposed(initValue, {
                persistKey: "",
            });
            stream.clearCache();
            expect(localStorage.removeItem).toHaveBeenCalledTimes(0);
        });
        it("should update cache when the state is updated", function () {
            var stream = new StreamAbstractionExposed(initValue, { persistKey: persistKey });
            expect(localStorage.setItem).toHaveBeenCalledTimes(0);
            stream.next_exposed(55);
            expect(localStorage.setItem).toHaveBeenCalledTimes(1);
        });
        it("should not update cache when the state is updated if `persistKey` key is undefined", function () {
            var stream = new StreamAbstractionExposed(initValue, {
                persistKey: "",
            });
            expect(localStorage.setItem).toHaveBeenCalledTimes(0);
            stream.next_exposed(55);
            expect(localStorage.setItem).toHaveBeenCalledTimes(0);
        });
    });
});
