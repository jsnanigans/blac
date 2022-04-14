import BlocBase from "./BlocBase";
import { BlocOptions } from "./types";

type EventHandler<E, T> = (
  event: E,
  emit: (state: T) => void,
  state: T
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
      if(this.isEventPassedCorrespondTo(event, eventName, handler)){
        handler(event, this.emit(event), this.state)
        return
      }
    }
    console.warn(`Event is not handled in Bloc:`, { event, bloc: this });
  };

  private isEventPassedCorrespondTo = (passedEvent: E, registeredEventName: E, registeredEventHandler: EventHandler<E, T>) =>{

      return this.didAddNonInstantiatedEvent(passedEvent, registeredEventName) ||
      this.didAddInstantiatedEvent(passedEvent, registeredEventName);

  }

  private didAddNonInstantiatedEvent(event: E, eventName: E){
    return eventName === event;
  }


  private didAddInstantiatedEvent(eventAsObject: E, eventAsFunction: E){
    /*
      A very hacky solution. JS is a nightmare with objects.
      Normally we check the events as the same type or not.
      However sometimes client needs to pass in data with the event, in that circumstance,
      they need to have the payload in the event, meaning they instantiate the event.
      That makes the type and event different, even more so
      since the type is abstract and event is a instantiated subclass
      thanks to the grand js, we litterally cannot check if one is another or cast (generic types) or
      type-check. (i couldn't find a better solution btw maybe we can)

      Moreover the code stores instantiated events as lambda functions

      Now, to check type and object equality, we need to get their real"Subclass"Names to compare them
      As you can see from realEventName, we get the real class Name, then
      we take the constructor name of the input event and since the constructor name will
      equal to real name of class, voila!
       */
    let realEventName = (eventAsFunction as any).name;
    var constructorName = Object.getPrototypeOf(eventAsObject).constructor.name;

    return realEventName === constructorName;
  }


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
