import BlocBase from "./BlocBase";
import { BlocConsumer } from "./BlocConsumer";

describe("BlocBase", () => {
  class TestBloc extends BlocBase<boolean> {
    constructor() {
      super(false);
    }
  }

  it("should have a `set consumer` method", () => {
    expect(new TestBloc()).toHaveProperty("consumer");
  });

  it("should allow setting the consumer", () => {
    const bloc = new TestBloc();
    try {
      bloc.consumer = new BlocConsumer([]);
    } catch (e) {
      fail(e);
    }
  });

  describe("Register Listener", function() {
    it("should add and remove `Register Listener`", function() {
      const stream = new BlocBase('');
      const method = jest.fn();
      const remove= stream.addRegisterListener(method);
      expect(stream.registerListeners).toHaveLength(1);
      remove();
      expect(stream.registerListeners).toHaveLength(0);
    });
  });

  describe("Change Listener", function() {
    it("should add and remove `Change Listener`", function() {
      const stream = new BlocBase('');
      const method = jest.fn();
      const remove= stream.addChangeListener(method);
      expect(stream.changeListeners).toHaveLength(1);
      remove();
      expect(stream.changeListeners).toHaveLength(0);
    });
  });

  describe("Value Change Listener", function() {
    it("should add and remove `Value Change Listener`", function() {
      const stream = new BlocBase('');
      const method = jest.fn();
      const remove= stream.addValueChangeListener(method);
      expect(stream.valueChangeListeners).toHaveLength(1);
      remove();
      expect(stream.valueChangeListeners).toHaveLength(0);
    });
  });

  describe("notifyChange", function() {
    it("should call change listeners", function() {
      const stream = new BlocBase('');
      const method = jest.fn();
      stream.addChangeListener(method);
      stream.notifyChange('');
      expect(method).toHaveBeenCalledTimes(1)
    });
  });

  describe("notifyValueChange", function() {
    it("should call change listeners", function() {
      const stream = new BlocBase('');
      const method = jest.fn();
      stream.addValueChangeListener(method);
      stream.notifyValueChange();
      expect(method).toHaveBeenCalledTimes(1)
    });
  });
});
