import { BehaviorSubject, Subscription } from "rxjs";
import { BlocOptions } from "./types";
import { cubitDefaultOptions, LOCAL_STORAGE_PREFIX } from "./constants";

export default class StreamAbstraction<T> {
  protected readonly _options: BlocOptions;
  private _subject: BehaviorSubject<T>;

  constructor(initialValue: T, blocOptions: BlocOptions = {}) {
    let value: any = initialValue;
    const options = { ...cubitDefaultOptions, ...blocOptions };
    this._options = options;

    if (options.persistKey && options.persistData) {
      const cachedValue = this.getCachedValue();
      if (!(cachedValue instanceof Error)) {
        value = cachedValue;
      }
    }

    this._subject = new BehaviorSubject(value);
  }

  public get state(): T {
    return this._subject.getValue();
  }

  public subscribe = (
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription => this._subject.subscribe(next, error, complete);

  public complete = (): void => this._subject.complete();

  public clearCache = (): void => {
    const key = this._options.persistKey;
    if (key) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    }
  };

  protected next = (value: T): void => {
    this._subject.next(value);
    this.updateCache();
  }

  protected parseFromCache = (state: string): T => {
    return JSON.parse(state).state;
  };

  protected parseToCache = (state: T): string => {
    return JSON.stringify({ state });
  };

  protected getCachedValue = (): T | Error => {
    const cachedValue = localStorage.getItem(
      `${LOCAL_STORAGE_PREFIX}${this._options.persistKey}`
    );
    if (cachedValue) {
      try {
        return this.parseFromCache(cachedValue);
      } catch (e) {
        const error = new Error(`Failed to parse JSON in localstorage for the key: "${LOCAL_STORAGE_PREFIX}${this._options.persistKey}"`);
        console.error(error);
        return error;
      }
    }
    return new Error("Key not found");
  };

  protected updateCache = (): void => {
    const { persistData, persistKey } = this._options;
    if (persistData && persistKey) {
      localStorage.setItem(
        `${LOCAL_STORAGE_PREFIX}${persistKey}`,
        this.parseToCache(this.state)
      );
    } else {
      this.clearCache();
    }
  };
}
