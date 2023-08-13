import { Blac, BlacEvent, BlacPlugin, BlocBase, Cubit } from "blac/src";

interface AppStateComponentsBlocState {
  blocs: BlocBase<any>[];
  selectedBloc: BlocBase<any> | undefined;
  lastChanged: number;
  selectedState?: any;
}

export class AppStateComponentsBloc extends Cubit<AppStateComponentsBlocState> {
  keepAlive = true;
  private blocSubscriberMap = new Map<BlocBase<any>, () => void>();

  constructor() {
    super({
      blocs: [],
      selectedBloc: undefined,
      lastChanged: Date.now()
    });

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

  private handleBlocStateChanged(event: BlacEvent.STATE_CHANGED, bloc: BlocBase<any>, params: {
    newState: any;
    oldState: any;
  }) {

  }

  private handleBlocCreated(event: BlacEvent.BLOC_CREATED, bloc: BlocBase<any>) {
    const unsub = bloc.observer.subscribe((newState, oldState) => {
      if (bloc === this.state.selectedBloc) {
        this.updateSelectedState(newState);
      }
    }, true);

    this.blocSubscriberMap.set(bloc, unsub);

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

const appState = Blac.getInstance().getBloc(AppStateComponentsBloc);

