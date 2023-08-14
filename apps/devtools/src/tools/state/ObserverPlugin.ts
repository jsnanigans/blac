import { Blac, BlacEvent, BlacPlugin, BlocBase, Cubit } from "blac/src";

interface Change {
  bloc: BlocBase<any>;
  state: any;
  oldState: any;
  time: number;
}

interface AppStateComponentsBlocState {
  blocs: BlocBase<any>[];
  selectedBloc: BlocBase<any> | undefined;
  lastChanged: Map<BlocBase<any>, Change>;
  selectedState?: any;
}

export class AppStateComponentsBloc extends Cubit<AppStateComponentsBlocState> {
  keepAlive = true;
  private blocSubscriberMap = new Map<BlocBase<any>, () => void>();

  constructor() {
    super({
      blocs: [],
      selectedBloc: undefined,
      lastChanged: new Map()
    });
    console.log("new list");

    this.registerPlugin();
  }

  registerPlugin() {
    const plugin: BlacPlugin = {
      name: "React Demo",
      onEvent: this.handleIncomingEvent
    };

    Blac.addPlugin(plugin);
  }

  handleIncomingEvent = (event: BlacEvent, bloc: BlocBase<any>, params: any) => {
    switch (event) {
      case BlacEvent.BLOC_CREATED:
        this.handleBlocCreated(event, bloc);
        break;
      case BlacEvent.BLOC_DISPOSED:
        this.handleBlocDisposed(event, bloc);
        break;
      case BlacEvent.LISTENER_ADDED:
        break;
      case BlacEvent.LISTENER_REMOVED:
        break;
      case BlacEvent.STATE_CHANGED:
        this.handleBlocStateChanged(event, bloc, params);
        break;
      default:
        break;
    }
  };

  updateSelectedState = (newState: any) => {
    try {
      newState = JSON.stringify(newState);
      this.patch({
        selectedState: newState
      });
    } catch (e) {
      this.patch({
        selectedState: undefined
      });
    }
  };

  public selectBloc = (bloc: BlocBase<any>) => {
    this.patch({
      selectedBloc: bloc
    });
    this.updateSelectedState(bloc.state);
  };

  getBlocChanges = (bloc: BlocBase<any>) => {
    return this.state.lastChanged.get(bloc);
  };

  getBlocKey = (bloc: BlocBase<any>): string => {
    const lastUpdated = this.getBlocChanges(bloc);
    return `${bloc.name}#${bloc.id}#${lastUpdated?.time ?? 0}`;
  };

  disposeBloc = (bloc: BlocBase<any>) => {
    bloc.dispose();
  };

  private handleBlocStateChanged(event: BlacEvent.STATE_CHANGED, bloc: BlocBase<any>, params: {
    newState: any;
    oldState: any;
  }) {
    if (bloc === this) {
      return;
    }

    if (bloc === this.state.selectedBloc) {
      this.updateSelectedState(params.newState);
    }

    if (!bloc.isolated) {
      this.patch({
        lastChanged: new Map(this.state.lastChanged).set(bloc, {
          bloc,
          state: params.newState,
          oldState: params.oldState,
          time: Date.now()
        })
      });
    }
  }

  private handleBlocCreated(event: BlacEvent.BLOC_CREATED, bloc: BlocBase<any>) {
    if (bloc === this) {
      return;
    }
    this.patch({
      blocs: [...this.state.blocs, bloc]
    });
  }

  private handleBlocDisposed(event: BlacEvent.BLOC_DISPOSED, bloc: BlocBase<any>) {
    let selectedBloc = this.state.selectedBloc;
    let selectedState = this.state.selectedState;

    const unsub = this.blocSubscriberMap.get(bloc);
    if (unsub) {
      unsub();
      this.blocSubscriberMap.delete(bloc);
    }

    if (selectedBloc === bloc) {
      selectedBloc = undefined;
      selectedState = undefined;
    }

    this.patch({
      blocs: this.state.blocs.filter(b => b !== bloc),
      selectedBloc,
      selectedState
    });
  }
}

const appState = Blac.getInstance().getBloc(AppStateComponentsBloc, {
  id: "appState"
});

