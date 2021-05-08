import CounterCubit from "./bloc/CounterCubit";
import PreferencesCubit from "./bloc/PreferencesCubit";
import AuthBloc from "./bloc/AuthBloc";
import { BlocReact } from "../lib";
import BlocObserver from "../lib/BlocObserver";

const state = new BlocReact(
  [new PreferencesCubit(), new AuthBloc(), new CounterCubit()]
);

state.observer = new BlocObserver({
  onChange: (b, e) => console.log({b, e}),
  onTransition: (b, e) => console.log({b, e})
});

export const { useBloc, BlocBuilder, BlocProvider } = state;

export default state;
