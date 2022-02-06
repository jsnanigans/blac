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
import { BlocObserver } from "../../src/lib";
import { blocState } from "./state/state";
var Observer = /** @class */ (function (_super) {
    __extends(Observer, _super);
    function Observer() {
        var _this = _super.call(this) || this;
        _this.onBlocAdded = function (e) {
            blocState.add(e);
        };
        _this.onBlocRemoved = function (e) {
            blocState.remove(e);
        };
        _this.onChange = function (e) {
            blocState.update(e);
        };
        return _this;
    }
    return Observer;
}(BlocObserver));
export default Observer;
