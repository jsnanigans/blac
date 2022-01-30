import { Blac } from "../../../src/lib";
import BlocsCubit from "./BlocsCubit";

export const blocState = new BlocsCubit();
const state = new Blac(
  [blocState]
);

export const useBlocTools = state.useBloc;
