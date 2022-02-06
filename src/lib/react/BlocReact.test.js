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
import { act, renderHook } from "@testing-library/react-hooks";
import { BlocReact } from "./BlocReact";
import Cubit from "../Cubit";
import mockConsole from "jest-mock-console";
import React from "react";
import { mount, shallow } from "enzyme";
import { render } from "@testing-library/react";
import { useBloc, withBlocProvider } from "../../react/state";
var Test1 = /** @class */ (function (_super) {
    __extends(Test1, _super);
    function Test1(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, 1) || this;
        _this.increment = function () {
            _this.emit(_this.state + 1);
        };
        _this.reset = function () {
            _this.emit(1);
        };
        if (options.register) {
            _this.addRegisterListener(options.register);
        }
        return _this;
    }
    return Test1;
}(Cubit));
var Test2 = /** @class */ (function (_super) {
    __extends(Test2, _super);
    function Test2() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Test2;
}(Cubit));
var Test3 = /** @class */ (function (_super) {
    __extends(Test3, _super);
    function Test3() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Test3;
}(Test1));
var t1 = new Test1();
var testState = new BlocReact([t1]);
var BlocProvider = testState.BlocProvider, BlocBuilder = testState.BlocBuilder;
describe("BlocReact", function () {
    afterEach(function () {
        jest.resetAllMocks();
        act(function () {
            t1.reset();
        });
    });
    describe("useBloc", function () {
        it("should be defined", function () {
            expect(testState).toHaveProperty("useBloc");
        });
        it("should get data and handle state change", function () {
            var result = renderHook(function () { return testState.useBloc(Test1); }).result;
            var _a = result.current, instance = _a[1];
            expect(result.current[0]).toBe(1);
            expect(result.current[1] instanceof Test1).toBe(true);
            act(function () {
                instance.increment();
            });
            expect(result.current[0]).toBe(2);
        });
        it("should create new instance of the state for its own scope", function () {
            var result = renderHook(function () { return testState.useBloc(Test3, {
                create: function () { return new Test3(); }
            }); }).result;
            var _a = result.current, instance = _a[1];
            expect(result.current[0]).toBe(1);
            expect(result.current[1] instanceof Test1).toBe(true);
            act(function () {
                instance.increment();
            });
            expect(result.current[0]).toBe(2);
        });
        it("should log error if bloc is not in context", function () {
            mockConsole();
            var result = renderHook(function () { return testState.useBloc(Test2); }).result;
            expect(console.error).toHaveBeenCalledTimes(1);
            expect(result.current[1]).toStrictEqual({});
        });
        it("should get state from local provider", function () {
            var initialValue = 88;
            var Consumer = function () {
                var localState = testState.useBloc(Test2)[0];
                return React.createElement("div", null, localState);
            };
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: function () { return new Test2(initialValue); } },
                    React.createElement(Consumer, null));
            };
            var component = mount(React.createElement(Provider, null));
            expect(component.text()).toBe("".concat(initialValue));
        });
        it("should get state from local provider, as value", function () {
            var initialValue = 88;
            var Consumer = function () {
                var localState = testState.useBloc(Test2)[0];
                return React.createElement("div", null, localState);
            };
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: new Test2(initialValue) },
                    React.createElement(Consumer, null));
            };
            var component = mount(React.createElement(Provider, null));
            expect(component.text()).toBe("".concat(initialValue));
        });
        it("should handle bloc not defined", function () {
            mockConsole();
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: undefined });
            };
            mount(React.createElement(Provider, null));
            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith("BLoC is undefined");
        });
        it("should not react to state change if option `shouldUpdate` is false", function () {
            var result = renderHook(function () { return testState.useBloc(Test1, { subscribe: false }); }).result;
            var _a = result.current, instance = _a[1];
            expect(result.current[0]).toBe(1);
            act(function () {
                instance.increment();
            });
            expect(result.current[0]).toBe(1);
            expect(instance.state).toBe(2);
        });
        it("should call `shouldUpdate` and only update state if it returns true", function () {
            var result = renderHook(function () { return testState.useBloc(Test1, {
                shouldUpdate: function (event) { return event.nextState % 2 === 0; }
            }); }).result;
            var _a = result.current, instance = _a[1];
            expect(result.current[0]).toBe(1);
            act(function () {
                instance.increment();
            });
            expect(result.current[0]).toBe(2);
            act(function () {
                instance.increment();
            });
            expect(result.current[0]).toBe(2);
            expect(instance.state).toBe(3);
        });
    });
    describe("BlocBuilder", function () {
        it("should be defined", function () {
            expect(testState).toHaveProperty("BlocBuilder");
        });
        it("should get local state", function () {
            var initialValue = 88;
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: function () { return new Test2(initialValue); } },
                    React.createElement(BlocBuilder, { blocClass: Test2, builder: function (_a) {
                            var state = _a[0];
                            return React.createElement("div", null, state);
                        } }));
            };
            var component = mount(React.createElement(Provider, null));
            expect(component.text()).toBe("".concat(initialValue));
        });
    });
    describe("BlocProvider", function () {
        it("should be defined", function () {
            expect(testState).toHaveProperty("BlocProvider");
        });
        it("should should remove local bloc from list when unmounted", function (done) {
            var initialValue = 88;
            var remove = jest.fn();
            var bloc = new Test2(initialValue);
            bloc.addRemoveListener(remove);
            var Inner = function () {
                var localState = testState.useBloc(Test2)[0];
                return React.createElement("div", null, localState);
            };
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: bloc },
                    React.createElement(Inner, null));
            };
            var component = render(React.createElement(Provider, null));
            expect(remove).toHaveBeenCalledTimes(0);
            component.unmount();
            expect(remove).toHaveBeenCalledTimes(1);
            done();
        });
        it("should pass bloc as value, not function", function () {
            var initialValue = 88;
            var bloc = new Test2(initialValue);
            var Provider = function () {
                return React.createElement(BlocProvider, { bloc: bloc },
                    React.createElement(BlocBuilder, { blocClass: Test2, builder: function (_a) {
                            var state = _a[0];
                            return React.createElement("div", null, state);
                        } }));
            };
            var component = mount(React.createElement(Provider, null));
            expect(component.text()).toBe("".concat(initialValue));
        });
    });
    describe("withBlocProvider", function () {
        var Child = function () { return React.createElement("div", null, "Child"); };
        it("should setup state and work as expected", function () {
            var value = 382989239238;
            var Consumer = function () {
                var count = useBloc(Test2)[0];
                return React.createElement("div", null,
                    "Value: ",
                    count);
            };
            var Comp = withBlocProvider(new Test2(value))(Consumer);
            var component = mount(React.createElement("div", null,
                React.createElement(Comp, null)));
            expect(component.text()).toContain("Value: " + value);
        });
        it("should render with child", function () {
            var Comp = withBlocProvider(new Test2(2))(Child);
            var component = shallow(React.createElement(Comp, null));
            expect(component.find(Child).exists()).toBe(true);
        });
        it("should render with render with special name", function () {
            var Comp = withBlocProvider(new Test2(2))(Child);
            var component = shallow(React.createElement("div", null,
                React.createElement(Comp, null)));
            expect(component.find('WithBlocProvider').exists()).toBe(true);
        });
    });
});
