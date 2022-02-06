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
import Cubit from "../../lib/Cubit";
var PreferencesState = /** @class */ (function () {
    function PreferencesState(options) {
        if (options === void 0) { options = {}; }
        this.darkMode = Boolean(options.darkMode);
    }
    return PreferencesState;
}());
var PreferencesCubit = /** @class */ (function (_super) {
    __extends(PreferencesCubit, _super);
    function PreferencesCubit() {
        var _this = _super.call(this, new PreferencesState({ darkMode: true }), {
            persistKey: "preferences",
        }) || this;
        // jsonToState(v) {
        //   return new PreferencesState({darkMode: true});
        // }
        // stateToJson(v) {
        //   return super.stateToJson(v)
        // }
        _this.toggleTheme = function () {
            _this.emit(new PreferencesState(__assign(__assign({}, _this.state), { darkMode: !_this.state.darkMode })));
        };
        return _this;
        // console.log("INIT");
        // this.parseFromCache = (v) => {
        //   console.log({v});
        //   const parsed = super.parseFromCache(v);
        //   return new PreferencesState(parsed);
        // };
    }
    return PreferencesCubit;
}(Cubit));
export default PreferencesCubit;
