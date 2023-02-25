import Cubit from "../../v0_lib/Cubit";

class PreferencesState {
  darkMode: boolean;

  constructor(options: Partial<PreferencesState> = {}) {
    this.darkMode = Boolean(options.darkMode);
  }
}

export default class PreferencesCubit extends Cubit<PreferencesState> {
  constructor() {
    super(new PreferencesState({ darkMode: true }), {
      persistKey: "preferences",
    });

    // console.log("INIT");
    // this.parseFromCache = (v) => {
    //   console.log({v});
    //   const parsed = super.parseFromCache(v);
    //   return new PreferencesState(parsed);
    // };
  }

  // jsonToState(v) {
  //   return new PreferencesState({darkMode: true});
  // }

  // stateToJson(v) {
  //   return super.stateToJson(v)
  // }

  toggleTheme = (): void => {
    this.emit(
      new PreferencesState({
        ...this.state,
        darkMode: !this.state.darkMode,
      })
    );
  };
}
