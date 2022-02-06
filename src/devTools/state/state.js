import { BlocReact } from "../../../src/lib";
import BlocsCubit from "./BlocsCubit";
export var blocState = new BlocsCubit();
var state = new BlocReact([blocState]);
export var useBlocTools = state.useBloc;
