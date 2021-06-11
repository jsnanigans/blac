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

  it("should call register method when local bloc is added", function() {
    const notify = jest.fn();
    const consumer = new BlocConsumer([]);
    const bloc = new TestBloc();
    bloc.addRegisterListener(notify)
    consumer.addLocalBloc({ bloc, id: '20' });
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("should not emit transition event when closed", function() {
    const notify = jest.fn();
    const bloc = new TestBloc();
    const consumer = new BlocConsumer([]);
    consumer.addLocalBloc({ bloc, id: '909' });
    consumer.observer.onTransition = notify;
    bloc.add(AuthEvent.authenticated);
    consumer.removeLocalBloc('909', bloc);
    bloc.add(AuthEvent.unauthenticated);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when removing a bloc where no ID matches", function() {
    const notify = jest.fn();
    const bloc = new TestBloc();
    const consumer = new BlocConsumer([]);
    consumer.addLocalBloc({ bloc, id: '909' });
    consumer.observer.onTransition = notify;
    bloc.add(AuthEvent.authenticated);
    consumer.removeLocalBloc('1000', bloc);
    bloc.add(AuthEvent.unauthenticated);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  describe("ChangeListener", function() {
    it("should allow one bloc to listen to another bloc", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ChangeListener(notify, Test1);
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc({ bloc: local, id: '909' });
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
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should trigger listener "local"
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
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should not trigger listener "global"
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
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should trigger listener "all"
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global, { currentState: 1, nextState: 2 });
      consumer.removeLocalBloc('909', local);
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
    });
  });

  describe("ValueChangeListener", function() {
    it("should allow one bloc to listen to another bloc", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1);
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc({ bloc: local, id: '909' });
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(2);
      expect(notify).toHaveBeenCalledWith(local);
    });

    it("should allow filtering listener only for local blocs", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1, "local");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should trigger listener "local"
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
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(0);
      global.increment(); // should trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      local.increment(); // should not trigger listener "global"
      expect(notify).toHaveBeenCalledTimes(1);
    });

    it("should not notify changes after bloc has been removed", function() {
      const notify = jest.fn();
      const global = new Test1();
      const local = new Test1();
      const listener = new ValueChangeListener(notify, Test1, "all");
      const consumer = new BlocConsumer([global, listener]);
      consumer.addLocalBloc({ bloc: local, id: '909' }); // should trigger listener "all"
      global.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
      expect(notify).toHaveBeenCalledWith(global);
      consumer.removeLocalBloc('909', local);
      local.increment(); // should trigger listener "all"
      expect(notify).toHaveBeenCalledTimes(1);
    });

  });

  describe("getLocalBlocForProvider", function() {
    it("should return bloc that matches id and type", function() {
      const one = new Test1();
      const consumer = new BlocConsumer([]);
      consumer.addLocalBloc({ bloc: one, id: '909' });
      expect(consumer.getLocalBlocForProvider('909', Test1)).toBe(one);
    });

    it("should not return bloc after it hase been removed", function() {
      const one = new Test1();
      const consumer = new BlocConsumer([]);
      consumer.addLocalBloc({ bloc: one, id: '909' });
      expect(consumer.getLocalBlocForProvider('909', Test1)).toBe(one);
      consumer.removeLocalBloc('909', one);
      expect(consumer.getLocalBlocForProvider('909', Test1)).toBeUndefined();
    });

    it("should find matching type in tree if id matches but not the type", function() {
      const one = new Test1();
      const two = new TestBloc();
      const consumer = new BlocConsumer([]);
      consumer.addLocalBloc({ bloc: one, id: '909' });
      consumer.addLocalBloc({ bloc: two, id: '192', parent: '909' });
      consumer.addLocalBloc({ bloc: two, id: '5', parent: '192' });
      expect(consumer.getLocalBlocForProvider('5', Test1)).toBe(one);
      consumer.removeLocalBloc('909', one);
      expect(consumer.getLocalBlocForProvider('5', Test1)).toBeUndefined();
    });

    it("should return undefined if item cannot be found in tree", function() {
      const two = new TestBloc();
      const consumer = new BlocConsumer([]);
      consumer.addLocalBloc({ bloc: two, id: '909' });
      consumer.addLocalBloc({ bloc: two, id: '192', parent: '909' });
      consumer.addLocalBloc({ bloc: two, id: '5', parent: '192' });
      expect(consumer.getLocalBlocForProvider('5', Test1)).toBeUndefined();
    });
  });

  describe("getGlobalBloc", function() {
    it("should bloc from global state", function() {
      const bloc = new Test1();
      const consumer = new BlocConsumer([bloc]);
      const out = consumer.getGlobalBloc(Test1);
      expect(out instanceof Test1).toBe(true);
    });

    it("should return undefined if mocksEnabled is enabled and bloc is not found", function() {
      const bloc = new Test1();
      const consumer = new BlocConsumer([]);
      consumer.mocksEnabled = true;
      consumer.addBlocMock(bloc);
      const out = consumer.getGlobalBloc(TestBloc);
      expect(out).toBeUndefined();
    });
  });

  describe("addBlocMock", function() {
    it("should add bloc if mocksEnabled is enabled", function() {
      const bloc = new Test1();
      const consumer = new BlocConsumer([]);
      consumer.mocksEnabled = true;
      consumer.addBlocMock(bloc);
      const out = consumer.getGlobalBloc(Test1);
      expect(out).toBe(bloc);
    });

    it("should not add bloc if mocksEnabled is enabled", function() {
      const bloc = new Test1();
      const consumer = new BlocConsumer([]);
      consumer.mocksEnabled = false;
      consumer.addBlocMock(bloc);
      const out = consumer.getGlobalBloc(Test1);
      expect(out).toBeUndefined();
    });

  });
});
