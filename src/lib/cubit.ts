import {BehaviorSubject} from "rxjs";

export interface BlocOptions {
    persistKey?: string;
    persistData?: boolean;
}

export const blocDefaultOptions: BlocOptions = {
    persistKey: '',
    persistData: true,
};

export default class Cubit<T> {
    private readonly _subject: BehaviorSubject<T>;
    private readonly _options: BlocOptions;

    constructor(initialValue: T, blocOptions: BlocOptions = {}) {
        const options = {...blocDefaultOptions, ...blocOptions};
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

    get subject(): BehaviorSubject<T> {
        return this._subject;
    }

    get state(): T {
        return this.subject.getValue();
    }

    set persistData(setTo: boolean) {
        const previousOptions = {...this._options};
        this._options.persistData = setTo;
        if (!setTo) {
            this.clearCache();
        } else if (previousOptions.persistData === false) {
            this.updateCache();
        }
    }

    public emit(value: T): void {
        this.subject.next(value);
        this.updateCache();
    }

    parseFromCache(value: string): T {
        return JSON.parse(value).value;
    }

    parseToCache(value: T): string {
        return JSON.stringify({value});
    }

    // caching
    private getCachedValue(): T | undefined {
        const cachedValue = localStorage.getItem(`data.${this._options.persistKey}`);
        if (cachedValue) {
            try {
                return this.parseFromCache(cachedValue);
            } catch (e) {
                console.error(e);
            }
        }
        return;
    }

    private updateCache(): void {
        const {persistData, persistKey} = this._options;
        if (persistData && persistKey) {
            localStorage.setItem(`data.${persistKey}`, this.parseToCache(this.subject.getValue()));
        } else {
            this.clearCache();
        }
    }

    private clearCache(): void {
        const key = this._options.persistKey;
        if (key && this._options.persistData) {
            localStorage.removeItem(`data.${key}`);
        }
    }
}