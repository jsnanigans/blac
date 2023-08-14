import { Blac, BlacEvent, BlocInstanceId, Cubit } from "blac/src";

export interface BlocItem {
  name: string;
  id: BlocInstanceId;
  state: any;
  isIsolated: boolean;
  isCubit: boolean;
}

export interface BlacEventMessage {
  event: BlacEvent;
  bloc: BlocItem;
  params?: any;
}

interface Change {
  bloc: BlocItem;
  state: any;
  oldState: any;
  time: number;
}

interface AppStateComponentsBlocState {
  blocs: BlocItem[];
  selectedBloc: BlocItem | undefined;
  lastChanged: Map<BlocItem["id"], Change>;
  selectedState?: any;
}

export class AppStateComponentsBloc extends Cubit<AppStateComponentsBlocState> {
  keepAlive = true;
  cachedState: Map<string, any> = new Map();
  private blocSubscriberMap = new Map<BlocItem["id"], () => void>();

  constructor() {
    super({
      blocs: [],
      selectedBloc: undefined,
      lastChanged: new Map()
    });
    console.log("new list");
    this.connect();
  }

  connect() {
    console.log("connect from ConnectBloc in devtools");
    chrome.runtime.onMessage.addListener((msg) => {
      const event = msg.event as BlacEventMessage;
      if (event.event.startsWith("lifecycle#")) {
        this.handleLifecycleEvent(event.event);
      } else if (event.bloc) {
        this.handleIncomingEvent(event);
      }
    });

    this.sendRequestEvent("init");
  }

  sendRequestEvent = (event: string) => {
    // chrome.runtime.sendMessage({ event }).then((response) => {
    //   console.log("devtools message", response);
    // }).catch((err) => {
    //   console.log("devtools message error", err);
    // });
  };

  handleLifecycleEvent = (event: string) => {
    switch (event) {
      case "lifecycle#reset":
        this.emit({
          blocs: [],
          selectedBloc: undefined,
          lastChanged: new Map()
        });
    }
  };

  handleIncomingEvent = (event: BlacEventMessage) => {
    switch (event.event) {
      case BlacEvent.BLOC_CREATED:
        this.handleBlocCreated(event);
        break;
      case BlacEvent.BLOC_DISPOSED:
        this.handleBlocDisposed(event);
        break;
      case BlacEvent.LISTENER_ADDED:
        break;
      case BlacEvent.LISTENER_REMOVED:
        break;
      case BlacEvent.STATE_CHANGED:
        this.handleBlocStateChanged(event);
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
      console.log("new state", newState);
    } catch (e) {
      this.patch({
        selectedState: undefined
      });

      console.log("error", e);
    }
  };

  public selectBloc = (bloc: BlocItem) => {
    this.patch({
      selectedBloc: bloc
    });
    this.updateSelectedState(this.cachedState.get(this.getBlocKey(bloc, false)) ?? bloc.state);
  };

  getBlocChanges = (bloc: BlocItem) => {
    return this.state.lastChanged.get(bloc.id);
  };

  getBlocKey = (bloc: BlocItem, time = true): string => {
    const lastUpdated = this.getBlocChanges(bloc);
    const timePart = time ? `@${lastUpdated?.time ?? 0}` : "";
    return `${bloc.name}#${bloc.id}${timePart}`;
  };

  disposeBloc = (bloc: BlocItem) => {
    // bloc.dispose();
  };

  private handleBlocStateChanged(event: BlacEventMessage) {
    console.log("handle event change", event);

    const bloc = event.bloc;
    const params = event.params as { newState: any; oldState: any };

    if (bloc.id === this.state.selectedBloc?.id) {
      this.updateSelectedState(params.newState);
    }

    if (!bloc.isIsolated) {
      this.cachedState.set(this.getBlocKey(bloc, false), params.newState);
      this.patch({
        lastChanged: new Map(this.state.lastChanged).set(bloc.id, {
          bloc,
          state: params.newState,
          oldState: params.oldState,
          time: Date.now()
        })
      });
    }
  }

  private handleBlocCreated(event: BlacEventMessage) {
    const alreadyExists = this.state.blocs.find(b => b.id === event.bloc.id);

    if (alreadyExists) {
      return;
    }

    this.patch({
      blocs: [...this.state.blocs, event.bloc]
    });
  }

  private handleBlocDisposed(event: BlacEventMessage) {
    const bloc = event.bloc;
    let selectedBloc = this.state.selectedBloc;
    let selectedState = this.state.selectedState;

    const key = this.getBlocKey(bloc, false);
    this.cachedState.delete(key);

    const unsub = this.blocSubscriberMap.get(bloc.id);
    if (unsub) {
      unsub();
      this.blocSubscriberMap.delete(bloc.id);
    }

    if (selectedBloc?.id === bloc.id) {
      selectedBloc = undefined;
      selectedState = undefined;
    }

    this.patch({
      blocs: this.state.blocs.filter(b => b.id !== bloc.id),
      selectedBloc,
      selectedState
    });
  }
}

const appState = Blac.getInstance().getBloc(AppStateComponentsBloc, {
  id: "appState"
});

