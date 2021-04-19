import {BlocReact} from "../lib/blocReact";
import CounterBloc from "./bloc/CounterBloc";

const state = new BlocReact(() => [
    new CounterBloc(),
], {debug: true});

state.observer = console.log;

export const {
    useBloc,
    GlobalBlocProvider,
} = state;

export default state;