import { BlacReact } from "../../../src/lib";
import BlocsCubit from "./BlocsCubit";

export const blocState = new BlocsCubit();
const state = new BlacReact([blocState]);

export const { useBloc } = state;
