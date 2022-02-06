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
var Cubit = /** @class */ (function (_super) {
    __extends(Cubit, _super);
    function Cubit() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.emit = function (value) {
            _this.notifyChange(value);
            _this.next(value);
            _this.notifyValueChange();
        };
        return _this;
    }
    return Cubit;
}(BlocBase));
export default Cubit;
