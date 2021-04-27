import BlocBase from "./BlocBase";
import { BlocConsumer } from "./BlocConsumer";

describe("TestBloc", () => {
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
});
