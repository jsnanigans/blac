import { Cubit } from "../../v0_lib";
import BlocBase from "../../v0_lib/BlocBase";

class BlocState {
  blocs: BlocBase<any>[];
  updated?: BlocBase<any>;

  constructor(blocs: BlocBase<any>[], updated?: BlocBase<any>) {
    this.blocs = blocs;
    this.updated = updated;
  }
}

export default class BlocsCubit extends Cubit<BlocState> {
  constructor() {
    super(new BlocState([]));
  }

  add = (bloc: BlocBase<any>) => {
    this.emit(new BlocState([...this.state.blocs, bloc]));
  };

  remove = (bloc: BlocBase<any>) => {
    this.emit(new BlocState(this.state.blocs.filter((b) => b.id !== bloc.id)));
  };

  update = (bloc: BlocBase<any>) => {
    this.emit(
      new BlocState(
        this.state.blocs.map((b) => (b.id === bloc.id ? bloc : b)),
        bloc
      )
    );
  };
}
