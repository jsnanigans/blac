/**
 * Event fired when props are updated on a Bloc or Cubit instance.
 * This is primarily used internally by the framework to notify
 * about prop changes in React components.
 * @template P - The type of props being updated
 */
export class PropsUpdated<P = any> {
  constructor(public readonly props: P) {}
}
