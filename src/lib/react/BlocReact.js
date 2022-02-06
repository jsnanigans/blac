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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BlocConsumer } from "../BlocConsumer";
import createId from "../createId";
var defaultBlocHookOptions = {
    subscribe: true
};
var BlocRuntimeError = /** @class */ (function () {
    function BlocRuntimeError(message) {
        this.error = new Error(message);
    }
    return BlocRuntimeError;
}());
var NoValue = /** @class */ (function () {
    function NoValue() {
    }
    return NoValue;
}());
var BlocReact = /** @class */ (function (_super) {
    __extends(BlocReact, _super);
    function BlocReact(blocs, options) {
        var _this = _super.call(this, blocs, options) || this;
        _this.providerCount = 0;
        _this._contextLocalProviderKey = React.createContext('none');
        _this.useBloc = function (blocClass, options) {
            if (options === void 0) { options = {}; }
            var mergedOptions = __assign(__assign({}, defaultBlocHookOptions), options);
            var blocInstance = useMemo(function () { return options.create ? options.create() : undefined; }, []);
            if (!blocInstance) {
                var localProviderKey_1 = useContext(_this._contextLocalProviderKey);
                var localBlocInstance_1 = useMemo(function () { return _this.getLocalBlocForProvider(localProviderKey_1, blocClass); }, []);
                blocInstance = useMemo(function () { return localBlocInstance_1 || _this.getGlobalBlocInstance(_this._blocsGlobal, blocClass); }, []);
            }
            var subscribe = mergedOptions.subscribe, _a = mergedOptions.shouldUpdate, shouldUpdate = _a === void 0 ? true : _a;
            if (!blocInstance) {
                var name_1 = blocClass.prototype.constructor.name;
                var error = new BlocRuntimeError("\"".concat(name_1, "\" \n      no bloc with this name was found in the global context.\n      \n      # Solutions:\n      \n      1. Wrap your code in a BlocProvider.\n      \n      2. Add \"").concat(name_1, "\" to the \"BlocReact\" constructor:\n        const state = new BlocReact(\n          [\n            ...\n            new ").concat(name_1, "(),\n          ]\n        )\n      "));
                console.error(error.error);
                return [
                    NoValue,
                    {},
                    {
                        error: error,
                        complete: true
                    }
                ];
            }
            var _b = useState(blocInstance.state), data = _b[0], setData = _b[1];
            var updateData = useCallback(function (nextState) {
                if (shouldUpdate === true || shouldUpdate({ nextState: nextState, currentState: data })) {
                    setData(nextState);
                }
            }, []);
            useEffect(function () {
                if (subscribe) {
                    var subscription_1 = blocInstance === null || blocInstance === void 0 ? void 0 : blocInstance.subscribe({
                        next: updateData
                    });
                    return function () {
                        subscription_1 === null || subscription_1 === void 0 ? void 0 : subscription_1.unsubscribe();
                    };
                }
            }, []);
            return [
                data,
                blocInstance
            ];
        };
        _this.withBlocProvider = function (bloc) { return function (Component) {
            var BlocProvider = _this.BlocProvider;
            return /** @class */ (function (_super) {
                __extends(WithBlocProvider, _super);
                function WithBlocProvider() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                WithBlocProvider.prototype.render = function () {
                    return (React.createElement(BlocProvider, { bloc: bloc },
                        React.createElement(Component, __assign({}, this.props))));
                };
                return WithBlocProvider;
            }(React.Component));
        }; };
        _this._blocsGlobal = blocs;
        _this.BlocProvider = _this.BlocProvider.bind(_this);
        _this.BlocBuilder = _this.BlocBuilder.bind(_this);
        return _this;
    }
    // Components
    BlocReact.prototype.BlocBuilder = function (props) {
        var hook = this.useBloc(props.blocClass, {
            shouldUpdate: props.shouldUpdate
        });
        return props.builder(hook);
    };
    ;
    BlocReact.prototype.BlocProvider = function (props) {
        var _this = this;
        var id = useMemo(function () { return createId(); }, []);
        var localProviderKey = useContext(this._contextLocalProviderKey);
        var bloc = useMemo(function () {
            var newBloc = typeof props.bloc === "function" ? props.bloc(id) : props.bloc;
            if (newBloc) {
                _this.addLocalBloc({
                    bloc: newBloc,
                    id: id,
                    parent: localProviderKey
                });
            }
            else {
                console.error("BLoC is undefined");
            }
            return newBloc;
        }, []);
        var context = useMemo(function () {
            return React.createContext(bloc);
        }, [bloc]);
        useEffect(function () {
            return function () {
                _this.removeLocalBloc(id, bloc);
            };
        }, []);
        return (React.createElement(this._contextLocalProviderKey.Provider, { value: id },
            React.createElement(context.Provider, { value: bloc }, props.children)));
    };
    ;
    return BlocReact;
}(BlocConsumer));
export { BlocReact };
