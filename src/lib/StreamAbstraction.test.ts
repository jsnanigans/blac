import * as rxjs from "rxjs";
import mockConsole from "jest-mock-console";
import { LOCAL_STORAGE_PREFIX } from "./constants";
import StreamAbstraction from "./StreamAbstraction";
import { BlocOptions } from "./types";

describe("StreamAbstraction", () => {
  class StreamAbstractionExposed<T> extends StreamAbstraction<T> {
    constructor(initialValue: T, blocOptions: BlocOptions = {}) {
      super(initialValue, blocOptions);
    }

    public next_exposed(value: T) {
      this.next(value);
    }
  }

  const persistKey = "storeKey";
  const initValue = 42;
  const cachedValue = 100;

  describe("constructor", () => {
    it("should set initial value", () => {
      const bloc = new StreamAbstraction(42);
      expect(bloc.state).toBe(42);
    });

    it("should create a new BehaviorSubject with the initial value", () => {
      const mockSubject = jest.spyOn(rxjs, "BehaviorSubject");
      new StreamAbstraction(2);
      expect(mockSubject).toHaveBeenCalledTimes(1);
      expect(mockSubject).toHaveBeenCalledWith(2);
      mockSubject.mockRestore();
    });

    describe("Options", () => {
      beforeEach(() => {
        localStorage.setItem(
          LOCAL_STORAGE_PREFIX + persistKey,
          `{"state": ${cachedValue}}`
        );
      });

      it("should get value from localStorage if the key is defined", () => {
        const stream = new StreamAbstraction(initValue, { persistKey });
        expect(stream.state).toBe(cachedValue);
      });

      it("should use default value if localStorage key is not defined", () => {
        localStorage.removeItem(LOCAL_STORAGE_PREFIX + persistKey);
        const stream = new StreamAbstraction(initValue, { persistKey });
        expect(stream.state).toBe(initValue);
      });

      it("should not get value from localStorage if `persistKey` is not defined", () => {
        const stream = new StreamAbstraction(initValue, {});
        expect(stream.state).toBe(initValue);
      });

      it("should not get value from localStorage if `persistData` is false", () => {
        const stream = new StreamAbstraction(initValue, {
          persistKey,
          persistData: false,
        });
        expect(stream.state).toBe(initValue);
      });

      it("should handle invalid json in localstorage for the key", () => {
        mockConsole();
        localStorage.setItem(
          LOCAL_STORAGE_PREFIX + persistKey,
          `invalid json here: state": ${cachedValue}`
        );
        const stream = new StreamAbstraction(initValue, { persistKey });
        expect(stream.state).toBe(initValue);
        expect(console.error).toHaveBeenCalledTimes(1);
      });
    });

    describe("Stream Methods", () => {
      const spy = {
        next: jest.fn(),
      };

      beforeEach(() => {
        jest.resetAllMocks();
      });

      it("should expose a method `subscribe` to listen for changes", () => {
        const stream = new StreamAbstractionExposed(0);
        stream.subscribe(spy.next);
        expect(spy.next).toHaveBeenCalledTimes(1);
        stream.next_exposed(2);
        expect(spy.next).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Persist Data Methods", function () {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it("should clear the data from localstorage when `clearCache` is called", () => {
      const stream = new StreamAbstractionExposed(initValue, { persistKey });
      stream.clearCache();
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        LOCAL_STORAGE_PREFIX + persistKey
      );
    });

    it("should not do anything if there is no `persistKey` when `clearCache` is called", () => {
      const stream = new StreamAbstractionExposed(initValue, {
        persistKey: "",
      });
      stream.clearCache();
      expect(localStorage.removeItem).toHaveBeenCalledTimes(0);
    });

    it("should update cache when the state is updated", () => {
      const stream = new StreamAbstractionExposed(initValue, { persistKey });
      expect(localStorage.setItem).toHaveBeenCalledTimes(0);
      stream.next_exposed(55);
      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    });

    it("should not update cache when the state is updated if `persistKey` key is undefined", () => {
      const stream = new StreamAbstractionExposed(initValue, {
        persistKey: "",
      });
      expect(localStorage.setItem).toHaveBeenCalledTimes(0);
      stream.next_exposed(55);
      expect(localStorage.setItem).toHaveBeenCalledTimes(0);
    });
  });
});
