import BlocBase from "./BlocBase";
import { BlocOptions } from "./types";

type EventHandler<E, T> = (
  event: E,
  emit: (state: T) => void
) => void | Promise<void>;

export default class Bloc<E, T> extends BlocBase<T> {
  onTransition:
    | null
    | ((change: { currentState: T; event: E; nextState: T }) => void) = null;

  /**
   * @deprecated The method is deprecated. Use `on` to add your event handlers instead.
   */
  protected mapEventToState: null | ((event: E) => T) = null;
  eventHandlers: [E, EventHandler<E, T>][] = [];

  constructor(initialState: T, options?: BlocOptions) {
    super(initialState, options);
  }

  public add = (event: E): void => {
    for (const [eventName, handler] of this.eventHandlers) {
      if (eventName === event) {
        handler(event, this.emit(event));
        return;
      }
    }

    console.warn(`Event is not handled in Bloc:`, { event, bloc: this });
  };

  private emit = (event: E) => (newState: T) => {
    this.notifyChange(newState);
    this.notifyTransition(newState, event);
    this.next(newState);
    this.notifyValueChange();
  };

  /**
   * Add a listener to the Bloc for when a new event is added. There can only be one handler for each event.
   * @param event The event that was added to the Bloc
   * @param handler A method that receives the event and a `emit` function that can be used to update the state
   */
  public readonly on = (event: E, handler: EventHandler<E, T>): void => {
    this.eventHandlers.push([event, handler]);
  };

  protected notifyTransition = (state: T, event: E): void => {
    this.consumer?.notifyTransition(this, state, event);
    this.onTransition?.({
      currentState: this.state,
      event,
      nextState: state,
    });
  };
}
