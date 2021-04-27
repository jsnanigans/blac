import { BlocConsumer, BlocObserverScope } from "./BlocConsumer";
import Cubit from "./Cubit";
import { BlocClass } from "./types";

class TC extends Cubit<number> {
  constructor(options: { register?: () => void } = {}) {
    super(1);

    if (options.register) {
      this.onRegister = options.register;
    }
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

class TC_2 extends Cubit<number> {
  constructor(
    notify: (bloc: any, state: any) => void,
    listenFor: BlocClass<any>,
    scope: BlocObserverScope
  ) {
    super(1);

    this.onRegister = (consumer) => {
      consumer.addBlocObserver(
        listenFor,
        (bloc, state) => {
          notify(bloc, state);
        },
        scope
      );
    };
  }

  increment = () => {
    this.emit(this.state + 1);
  };
}

describe("BlocConsumer", function () {
  it("should call function set to observer prop on any state change", function () {
    const testCubit = new TC();
    const testBlocConsumer = new BlocConsumer([testCubit]);
    const fn = jest.fn();
    testBlocConsumer.observer = fn;
    testCubit.increment();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(testCubit, 2);
  });

  it("should call `onRegister` when the class is registered", function () {
    const register = jest.fn();
    const testCubit = new TC({
      register,
    });
    new BlocConsumer([testCubit]);
    expect(register).toHaveBeenCalledTimes(1);
  });

  describe("observers", function () {
    it("should allow one bloc to listen to another bloc", function () {
      const notify = jest.fn();
      const trigger = new TC();
      const listener = new TC_2(notify, TC, "all");
      new BlocConsumer([trigger, listener]);
      expect(notify).toHaveBeenCalledTimes(0);
      trigger.increment();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(trigger, 2);
    });

    it("should allow filtering listener only for local blocs", function () {
      const notify = jest.fn();
      const trigger = new TC();
      const listener = new TC_2(notify, TC, "local");
      new BlocConsumer([trigger, listener]);
      expect(notify).toHaveBeenCalledTimes(0);
      trigger.increment();
      expect(notify).toHaveBeenCalledTimes(0);
    });

    it("should allow filtering listener only for global blocs", function () {
      const notify = jest.fn();
      const trigger = new TC();
      const listener = new TC_2(notify, TC, "global");
      new BlocConsumer([trigger, listener]);
      expect(notify).toHaveBeenCalledTimes(0);
      trigger.increment();
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(trigger, 2);
    });
  });
});
