import {BlocReact} from "../lib/blocReact";
import CounterBloc from "./bloc/CounterBloc";
import PreferencesCubit from "./bloc/PreferencesCubit";

const state = new BlocReact(() => [
    new PreferencesCubit(),
], {debug: true});

state.observer = console.log;

export const {
    useBloc,
    GlobalBlocProvider,
} = state;

export default state;