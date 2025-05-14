export default class BlacEvent<T = any> extends CustomEvent<T> {
  constructor(type: string, eventInitDict?: CustomEventInit<T> | undefined) {
    super(type, eventInitDict);
  }
}
