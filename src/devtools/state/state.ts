import { BlocReact } from "../../lib";
import BlocsCubit from "./BlocsCubit";

export const blocState = new BlocsCubit();
const state = new BlocReact(
  [blocState]
);

export const useBlocTools = state.useBloc;
