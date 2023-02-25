import { Cubit } from "../../v0_lib";

export default class TestLocalCubit extends Cubit<string> {
  constructor() {
    super("one");
  }
}
