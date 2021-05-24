import CounterCubit from "./bloc/CounterCubit";
import PreferencesCubit from "./bloc/PreferencesCubit";
import AuthBloc from "./bloc/AuthBloc";
import { BlocReact } from "../lib";
import Observer from "../devtools/observer";

const state = new BlocReact(
  [new PreferencesCubit(), new AuthBloc(), new CounterCubit()],
  { observer: new Observer() }
);

export const { useBloc, BlocBuilder, BlocProvider } = state;

export default state;
