import CounterCubit from "./bloc/CounterCubit";
import PreferencesCubit from "./bloc/PreferencesCubit";
import AuthBloc from "./bloc/AuthBloc";
import { BlocReact } from "../lib";
import Observer from "../devTools/observer";
// import Observer from "../../devtools/src/observer";
var state = new BlocReact([new PreferencesCubit(), new AuthBloc(), new CounterCubit()], { observer: new Observer() });
export var useBloc = state.useBloc, BlocBuilder = state.BlocBuilder, BlocProvider = state.BlocProvider, withBlocProvider = state.withBlocProvider;
export default state;
