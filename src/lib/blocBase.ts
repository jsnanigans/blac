import { BehaviorSubject, Subscription } from "rxjs";
import { PartialObserver } from "rxjs/src/internal/types";

export interface BlocOptions {
  persistKey?: string;
  persistData?: boolean;
}

export const cubitDefaultOptions: BlocOptions = {
  persistKey: "",
  persistData: true
};

export default class BlocBase<T> {
  onChange: null | ((change: { currentState: T; nextState: T }) => void) = null;
  _localProviderRef = "";
  private readonly _subject: BehaviorSubject<T>;
  private readonly _options: BlocOptions;

  constructor(initialValue: T, cubitOptions: BlocOptions = {}) {
    const options = { ...cubitDefaultOptions, ...cubitOptions };
    this._options = options;
    let value = initialValue;

    if (options.persistKey && options.persistData) {
      const cachedValue = this.getCachedValue();
      if (cachedValue) {
        value = cachedValue;
      }
    }

    this._subject = new BehaviorSubject(value);
  }

  public get subject(): BehaviorSubject<T> {
    return this._subject;
  }

  public get state(): T {
    return this.subject.getValue();
  }

  set persistData(setTo: boolean) {
    const previousOptions = { ...this._options };
    this._options.persistData = setTo;
    if (!setTo) {
      this.clearCache();
    } else if (previousOptions.persistData === false) {
      this.updateCache();
    }
  }

  public getValue = (): T => this._subject.getValue();

  public subscribe = (next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription => this._subject.subscribe(next, error, complete);

  protected parseFromCache = (value: string): T => {
    return JSON.parse(value).value;
  };

  protected parseToCache = (value: T): string => {
    return JSON.stringify({ value });
  };

  protected notifyChange = (value: T): void => {
    this.onChange?.({
      currentState: this._subject.getValue(),
      nextState: value
    });
  };

  // caching
  protected getCachedValue = (): T | undefined => {
    const cachedValue = localStorage.getItem(
      `data.${this._options.persistKey}`
    );
    if (cachedValue) {
      try {
        return this.parseFromCache(cachedValue);
      } catch (e) {
        console.error(e);
      }
    }
  };

  protected updateCache = (): void => {
    const { persistData, persistKey } = this._options;
    if (persistData && persistKey) {
      localStorage.setItem(
        `data.${persistKey}`,
        this.parseToCache(this.subject.getValue())
      );
    } else {
      this.clearCache();
    }
  };

  protected clearCache = (): void => {
    const key = this._options.persistKey;
    if (key && this._options.persistData) {
      localStorage.removeItem(`data.${key}`);
    }
  };
}
