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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { Cubit } from "../../../src/lib";
var BlocState = /** @class */ (function () {
    function BlocState(blocs, updated) {
        this.blocs = blocs;
        this.updated = updated;
    }
    return BlocState;
}());
var BlocsCubit = /** @class */ (function (_super) {
    __extends(BlocsCubit, _super);
    function BlocsCubit() {
        var _this = _super.call(this, new BlocState([])) || this;
        _this.add = function (bloc) {
            _this.emit(new BlocState(__spreadArray(__spreadArray([], _this.state.blocs, true), [bloc], false)));
        };
        _this.remove = function (bloc) {
            _this.emit(new BlocState(_this.state.blocs.filter(function (b) { return b.id !== bloc.id; })));
        };
        _this.update = function (bloc) {
            _this.emit(new BlocState(_this.state.blocs.map(function (b) { return b.id === bloc.id ? bloc : b; }), bloc));
        };
        return _this;
    }
    return BlocsCubit;
}(Cubit));
export default BlocsCubit;
