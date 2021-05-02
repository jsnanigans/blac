import BlocBase from "./BlocBase";
import { ChangeEvent, TransitionEvent } from "./types";

export interface BlocObserverOptions {
  onChange?: (bloc: BlocBase<any>, event: ChangeEvent<any>) => void;
  onTransition?: (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => void;
}

export default class BlocObserver {
  constructor(methods: BlocObserverOptions = {}) {
    if (methods.onChange) this.onChange = methods.onChange;
    if (methods.onTransition) this.onTransition = methods.onTransition;
  }

  readonly addChange = (bloc: BlocBase<any>, state: any) => {
    this.onChange(bloc, this.createChangeEvent(bloc, state));
  }

  readonly addTransition = (bloc: BlocBase<any>, state: any, event: any) => {
    this.onTransition(bloc, this.createTransitionEvent(bloc, state, event));
  }

  onChange = (bloc: BlocBase<any>, event: ChangeEvent<any>) => {
    console.log('Change', bloc, event)
  }

  onTransition = (bloc: BlocBase<any>, event: TransitionEvent<any, any>) => {
    console.log('Transition', bloc, event)
  }

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