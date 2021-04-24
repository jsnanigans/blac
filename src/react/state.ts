import CounterCubit from "./bloc/CounterCubit";
import PreferencesCubit from "./bloc/PreferencesCubit";
import AuthBloc from "./bloc/AuthBloc";
import { BlocReact } from "../lib";

const state = new BlocReact(
  [new PreferencesCubit(), new AuthBloc(), new CounterCubit()],
  { debug: true }
);

state.observer = console.log;

export const { useBloc, GlobalBlocProvider, BlocBuilder, BlocProvider } = state;

export default state;
