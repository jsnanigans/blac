import { Cubit } from "../../../src/lib";
import BlocBase from "../../../src/lib/BlocBase";
declare class BlocState {
    blocs: BlocBase<any>[];
    updated?: BlocBase<any>;
    constructor(blocs: BlocBase<any>[], updated?: BlocBase<any>);
}
export default class BlocsCubit extends Cubit<BlocState> {
    constructor();
    add: (bloc: BlocBase<any>) => void;
    remove: (bloc: BlocBase<any>) => void;
    update: (bloc: BlocBase<any>) => void;
}
export {};
