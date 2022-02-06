import Cubit from "../../lib/Cubit";
declare class PreferencesState {
    darkMode: boolean;
    constructor(options?: Partial<PreferencesState>);
}
export default class PreferencesCubit extends Cubit<PreferencesState> {
    constructor();
    toggleTheme: () => void;
}
export {};
