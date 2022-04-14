import { Cubit } from "../../lib";

export default class TestLocalCubit extends Cubit<string> {
  constructor() {
    super("one");
  }
}
