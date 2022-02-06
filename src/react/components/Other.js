import { useBloc } from "../state";
import CounterCubit from "../bloc/CounterCubit";
import React from "react";
export default function Other() {
    var _a = useBloc(CounterCubit), value = _a[0], increment = _a[1].increment;
    return React.createElement("button", { onClick: function () { return increment(); } },
        "count is: ",
        value);
}
