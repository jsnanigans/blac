import CounterCubit from "./bloc/CounterCubit";
import PreferencesCubit from "./bloc/PreferencesCubit";
import AuthBloc from "./bloc/AuthBloc";
import { BlacReact } from "../lib";
import Observer from "../devTools/observer";
// import Observer from "../../devtools/src/observer";

const state = new BlacReact(
  [new PreferencesCubit(), new AuthBloc(), new CounterCubit()],
  { observer: new Observer() }
);

export const { useBloc, BlocBuilder, BlocProvider, withBlocProvider } = state;

export default state;
