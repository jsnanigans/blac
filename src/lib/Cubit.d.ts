import BlocBase from "./BlocBase";
export default class Cubit<T> extends BlocBase<T> {
    emit: (value: T) => void;
}
