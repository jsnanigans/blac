import { BlocConsumer } from "./BlocConsumer";
import BlocObserver from "./BlocObserver";
import { AuthEvent, ChangeListener, Test1, TestBloc, ValueChangeListener } from "../helpers/test.fixtures";


describe("BlocConsumer", function() {
  it("should call `onChange` on any state change", () => {
    const testCubit = new Test1();
    const testBlocConsumer = new BlocConsumer([testCubit]);
    const onChange = jest.fn();
    testBlocConsumer.observer = new BlocObserver({ onChange });
    testCubit.increment();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(testCubit, { currentState: 1, nextState: 2 });
  });

  it("should call `onTransition` on any state change for Blocs", () => {
    const testBloc = new TestBloc();
    const testBlocConsumer = new BlocConsumer([testBloc]);
    const onTransition = jest.fn();
    testBlocConsumer.observer = new BlocObserver({ onTransition });
    testBloc.add(AuthEvent.authenticated);
    expect(onTransition).toHaveBeenCalledTimes(1);
    expect(onTransition).toHaveBeenCalledWith(testBloc, {
      currentState: false,
      event: AuthEvent.authenticated,
      nextState: true
    });
  });

  it("should call `onRegister` when the class is registered", function() {
    const register = jest.fn();
    const testCubit = new Test1({
      register
    });
    new BlocConsumer([testCubit]);
    expect(register).toHaveBeenCalledTimes(1);
  });

  describe("ChangeListener", function() {
    it("should allow one bloc to listen to another bloc", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ChangeListener(notify, Test1);
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local);
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, { currentState: 1, nextState: 2 });
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it("should allow filtering listener only for local blocs", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ChangeListener(notify, Test1, "local");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should trigger listener "local"
      global.increment(); // should not trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(0);
      local.increment(); // should trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(local, { currentState: 1, nextState: 2 });
    });

    it("should allow filtering listener only for global blocs", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ChangeListener(notify, Test1, "global");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, { currentState: 1, nextState: 2 });
      local.increment(); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should allow not notify changes after bloc has been removed", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ChangeListener(notify, Test1, "all");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should trigger listener "all"
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, { currentState: 1, nextState: 2 });
      consumer.removeLocalBloc("abc");
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });
  });

  describe("ValueChangeListener", function() {
    it("should allow one bloc to listen to another bloc", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1);
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local);
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });

    it("should allow filtering listener only for local blocs", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1, "local");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should trigger listener "local"
      global.increment(); // should not trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(0);
      local.increment(); // should trigger listener "local"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(local);
    });

    it("should allow filtering listener only for global blocs", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1, "global");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      local.increment(); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should allow not notify changes after bloc has been removed", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1, "all");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc("abc", local); // should trigger listener "all"
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      consumer.removeLocalBloc("abc");
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
    });
  });

  describe("getGlobalBloc", function() {
    it("should bloc from global state", function() {
      const bloc = new Test1();
      const consumer = new BlocConsumer([bloc]);
      const out = consumer.getGlobalBloc(Test1);
      expect(out instanceof Test1).toBe(true);
    });

  });
});
