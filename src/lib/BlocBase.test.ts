import BlocBase from "./BlocBase";

describe("TestBloc", () => {
  class TestBloc extends BlocBase<boolean> {
    constructor() {
      super(false);
    }
  }

  it("should have a `set consumer` method", () => {
    expect(new TestBloc()).toHaveProperty("consumer");
  });
});
