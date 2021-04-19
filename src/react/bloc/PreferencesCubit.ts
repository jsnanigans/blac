import Cubit from "../../lib/cubit";

class PreferencesState {
    darkMode: boolean;

    constructor(options: Partial<PreferencesState> = {}) {
        this.darkMode = Boolean(options.darkMode);
    }
}

export default class PreferencesCubit extends Cubit<PreferencesState> {
    constructor() {
        super(new PreferencesState({darkMode: true}), {
            persistKey: 'preferences'
        });
    }

    toggleTheme = () => {
        this.emit(new PreferencesState({
            ...this.state,
            darkMode: !this.state.darkMode,
        }))
    }
}