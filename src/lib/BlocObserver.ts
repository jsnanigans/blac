import BlocBase from "./BlocBase";
import { ChangeEvent, TransitionEvent } from "./types";

export interface BlocObserverOptions {
  /* Called whenever any state changes global or local, Bloc or Cubit. */
  onChange?: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void;
  /* Called only when a Bloc changes (global or local). */
  onTransition?: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void;
}


export default class BlocObserver {
  onChange: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void
  onTransition: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void

  constructor(methods: BlocObserverOptions = {}) {
    this.onChange = methods.onChange ? methods.onChange : this.defaultAction;
    this.onTransition = methods.onTransition ? methods.onTransition : this.defaultAction;
  }

  // trigger events
  readonly addChange = (bloc: BlocBase<any>, state: any) => {
    this.onChange(bloc, this.createChangeEvent(bloc, state));
  }

  readonly addTransition = (bloc: BlocBase<any>, state: any, event: any) => {
    this.onTransition(bloc, this.createTransitionEvent(bloc, state, event));
  }
  readonly addBlocAdded = (bloc: BlocBase<any>) => {
    this.onBlocAdded(bloc);
  }
  readonly addBlocRemoved = (bloc: BlocBase<any>) => {
    this.onBlocRemoved(bloc);
  }


  // consume
  private readonly defaultAction = () => {}

  onBlocAdded: (bloc: BlocBase<any>) => void = this.defaultAction
  onBlocRemoved: (bloc: BlocBase<any>) => void = this.defaultAction

  private createTransitionEvent(bloc: BlocBase<any>, state: any, event: any): TransitionEvent<any, any> {
    return {
      currentState: bloc.state,
      event,
      nextState: state,
    }
  }

  private createChangeEvent(bloc: BlocBase<any>, state: any): ChangeEvent<any> {
    return {
      currentState: bloc.state,
      nextState: state,
    }
  }
}