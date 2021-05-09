import Cubit from "./Cubit";

describe("Cubit", () => {
  const spy = {
    onChange: jest.fn(),
  };

  class TestCubit extends Cubit<number> {
    constructor() {
      super(0);
      this.onChange = spy.onChange;
    }

    increment = (): void => this.emit(this.state + 1);
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should add the protected `emit` method", () => {
    expect(new TestCubit()).toHaveProperty("emit");
  });

  describe("emit", () => {
    it("should update the state when emit is called", () => {
      const cubit = new TestCubit();
      expect(cubit.state).toBe(0);
      cubit.increment();
      expect(cubit.state).toBe(1);
    });

    it("should call `onChange` before the state changes", () => {
      const cubit = new TestCubit();
      expect(spy.onChange).toHaveBeenCalledTimes(0);
      cubit.increment();
      expect(spy.onChange).toHaveBeenCalledWith({
        currentState: 0,
        nextState: 1,
      });
    });
  });
});
