import { BlacEvent, BlacPlugin, BlocBase, Cubit } from "blac/src";
import { BlacEventMessage } from "./state/AppStateComponentsBloc";


class DevToolsConnectBloc {
  constructor() {
    console.log("new connect bloc");
    this.registerPlugin();
  }

  registerPlugin() {
    const plugin: BlacPlugin = {
      name: "React Demo",
      onEvent: this.handleIncomingEvent
    };

    if (window.__blac) {
      window.__blac.addPlugin(plugin);
      console.log("Blac debugger connected");
      this.addRequestEventListener();
      this.sendLifecycleEvent("reset");
      setInterval(() => {
        this.sendAllCreatedBlocs();
      }, 1000);
    } else {
      console.warn(`Blac debugger could not connect, set 
Blac.configure({
  exposeBlacInstance: true
});
in your app to expose the Blac instance.
      `);
    }
  }

  sendAllCreatedBlocs() {
    if (!window.__blac) {
      return;
    }

    // this.sendLifecycleEvent("reset-blocs");

    const blocs = window.__blac.blocInstanceMap.values();
    // const isolatedBlocs = window.__blac.isolatedBlocMap.values();

    const allBlocs = [...blocs].flat();

    allBlocs.forEach((bloc) => {
      this.sendBlacEventAsObject(BlacEvent.BLOC_CREATED, bloc, undefined);
    });
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

  sendBlacEventAsObject = (event: BlacEvent, bloc: BlocBase<any>, params: any): void => {
    let state = undefined;

    try {
      state = JSON.parse(JSON.stringify(bloc.state));
    } catch (e) {
      state = undefined;
    }

    const detail: BlacEventMessage = {
      event,
      bloc: {
        name: bloc.constructor.name,
        id: bloc.id,
        state,
        isIsolated: bloc.isolated,
        isCubit: bloc instanceof Cubit
      },
      params
    };

    document.dispatchEvent(
      new CustomEvent("blac-event", {
        detail
      })
    );
  };

  sendLifecycleEvent = (event: string) => {
    document.dispatchEvent(
      new CustomEvent("blac-event", {
        detail: {
          event: `lifecycle#${event}`
        }
      })
    );
  };

  addRequestEventListener = () => {
    console.log("add request listener");
    document.addEventListener("blac-event-request", this.handleIncomingRequestEvent as any);
  };

  handleIncomingRequestEvent = (rawEvent: CustomEvent) => {
    console.log("incoming", rawEvent);
  };

  handleBlocCreated = (event: BlacEvent, bloc: BlocBase<any>) => {
    // this.sendBlacEventAsObject(event, bloc, undefined);
  };

  handleBlocDisposed = (event: BlacEvent, bloc: BlocBase<any>) => {
    this.sendBlacEventAsObject(event, bloc, undefined);
  };

  handleBlocStateChanged = (event: BlacEvent, bloc: BlocBase<any>, params: any) => {
    this.sendBlacEventAsObject(event, bloc, params);
  };
}

new DevToolsConnectBloc();
