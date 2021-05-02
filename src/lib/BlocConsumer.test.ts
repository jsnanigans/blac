import { BlocConsumer, BlocObserverScope } from "./BlocConsumer";
import Cubit from "./Cubit";
import { BlocClass } from "./types";
import BlocObserver from "./BlocObserver";

class Test1 extends Cubit<number> {
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

class Listener extends Cubit<number> {
  constructor(
    notify: (bloc: any, state: any) => void,
    listenFor: BlocClass<any>,
    scope?: BlocObserverScope
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
    const testCubit = new Test1();
    const testBlocConsumer = new BlocConsumer([testCubit]);
    const onChange = jest.fn();
    testBlocConsumer.observer = new BlocObserver({onChange});
    testCubit.increment();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(testCubit, {currentState: 1, nextState: 2});
  });

  it("should call `onRegister` when the class is registered", function () {
    const register = jest.fn();
    const testCubit = new Test1({
      register,
    });
    new BlocConsumer([testCubit]);
    expect(register).toHaveBeenCalledTimes(1);
  });

  describe("observers", function () {
    it("should allow one bloc to listen to another bloc", function () {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new Listener(notify, Test1);
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc('abc', local);
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, {currentState: 1, nextState: 2});
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it("should allow filtering listener only for local blocs", function () {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new Listener(notify, Test1, "local");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc('abc', local); // should trigger listener "local"
      global.increment(); // should not trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(0);
      local.increment(); // should trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(local, {currentState: 1, nextState: 2});
    });

    it("should allow filtering listener only for global blocs", function () {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new Listener(notify, Test1, "global");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc('abc', local); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, {currentState: 1, nextState: 2});
      local.increment(); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should allow not notify changes after bloc has been removed", function () {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new Listener(notify, Test1, "all");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc('abc', local); // should trigger listener "all"
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, {currentState: 1, nextState: 2});
      consumer.removeLocalBloc('abc');
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });
  });
});
